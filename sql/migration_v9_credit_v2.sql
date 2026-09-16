-- ============================================================
-- BioQuest — 信用指数（CR）v2 科学模型（可选迁移，幂等）
-- ------------------------------------------------------------
-- 背景：旧模型（apply_cr_decay_and_adjust）对「无违规也随时间无条件指数衰减、
--       且衰减速率(1%/天)远超行为收益」——机制上自相矛盾，信用会系统性蒸发。
-- 本迁移把 profiles.cr 的计算升级为 v2 近因模型：
--   CR' = clamp( CR_BASE + Σ 行为×近因权重 − Σ 违规×近因权重 − Σ 消费, 0, CAP )
--   近因权重 w = e^(−0.03×天数)（半衰期 ≈ 23 天）
--   行为/违规参数与前端 js/core/credit-metrics.js 的 CR_V2 常量保持一致。
--
-- ⚠️ 执行前请确认：执行后 profiles.cr 的数值语义切换为 v2（新注册用户 base=100；
--   存量用户 cr 会被按近因模型折算）。建议在维护窗口执行并在前端发布后同步。
-- 幂等：所有语句可重复执行；未执行本迁移不影响现有功能（前端展示 v2 推演与说明）。
-- ============================================================

-- 0. profiles 增加 v2 必要的辅助列（幂等）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'cr_cap' AND table_schema = 'public'
    ) THEN
        ALTER TABLE profiles ADD COLUMN cr_cap NUMERIC DEFAULT 200;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'profiles' AND column_name = 'cr_base' AND table_schema = 'public'
    ) THEN
        ALTER TABLE profiles ADD COLUMN cr_base NUMERIC DEFAULT 100;
    END IF;
END $$;

-- 1. v2 信用计算函数（幂等：CREATE OR REPLACE）
--    输入：行为/违规记账表 cr_logs（amount>0 为行为加分，amount<0 为违规/消费扣减）
-- 注意：cr_logs.amount 语义需与前端记账一致（正=收益，负=惩罚/消费）。
CREATE OR REPLACE FUNCTION public.apply_cr_v2(
    p_user_id UUID,
    p_now TIMESTAMPTZ DEFAULT now()
)
RETURNS NUMERIC AS $$
DECLARE
    v_base NUMERIC;
    v_cap NUMERIC;
    v_kappa NUMERIC := 0.03;                 -- 近因衰减速率/天
    v_total NUMERIC := 0;
    v_row RECORD;
    v_age_days NUMERIC;
BEGIN
    SELECT COALESCE(cr_base, 100), COALESCE(cr_cap, 200)
      INTO v_base, v_cap
      FROM public.profiles WHERE id = p_user_id;
    IF v_base IS NULL THEN v_base := 100; END IF;
    IF v_cap IS NULL THEN v_cap := 200; END IF;

    -- 行为收益 + 违规/消费扣减，均按近因权重 e^(−κ·ageDays)
    FOR v_row IN
        SELECT amount, created_at FROM public.cr_logs
        WHERE user_id = p_user_id AND created_at <= p_now
    LOOP
        v_age_days := GREATEST(0, EXTRACT(EPOCH FROM (p_now - v_row.created_at)) / 86400.0);
        v_total := v_total + v_row.amount * EXP(-v_kappa * v_age_days);
    END LOOP;

    -- clamp：0 ≤ CR ≤ CAP，基础信任常驻
    RETURN GREATEST(0, LEAST(v_cap, v_base + v_total));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. 把 cr_updated_at 触发器接入 v2（可选；注释掉则保持旧触发器）
--    旧触发器为 on_cr_updated 内的逻辑（incremental_update.sql 的 apply_cr_decay_and_adjust）。
--    本迁移提供新触发器，执行后每次 cr_logs 写入即按 v2 重算 profiles.cr。
CREATE OR REPLACE FUNCTION public.recompute_cr_v2_on_log()
RETURNS trigger AS $$
DECLARE
    v_new NUMERIC;
BEGIN
    v_new := public.apply_cr_v2(NEW.user_id);
    UPDATE public.profiles
       SET cr = v_new, cr_updated_at = now()
     WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_cr_log_v2 ON cr_logs;
CREATE TRIGGER on_cr_log_v2
    AFTER INSERT ON cr_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.recompute_cr_v2_on_log();

-- 3. 启用 v2 时需要先重建存量（可选，管理员判断）：
--    UPDATE profiles SET cr = LEAST(COALESCE(cr_cap,200), GREATEST(0, apply_cr_v2(id)));

-- 4. 用户组联动继续保持（cr>=100 premium / cr>=50 verified / <50 member，见 incremental_update.sql）