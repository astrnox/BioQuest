// Gantt chart for summer plan
(function() {
  var style = getComputedStyle(document.documentElement);
  var accent = style.getPropertyValue('--accent').trim();
  var accent2 = style.getPropertyValue('--accent2').trim();
  var ink = style.getPropertyValue('--ink').trim();
  var muted = style.getPropertyValue('--muted').trim();
  var rule = style.getPropertyValue('--rule').trim();
  var bg2 = style.getPropertyValue('--bg2').trim();

  // Task data: [name, start_date, end_date, color]
  var tasks = [
    { name: '生物竞赛集训营', start: '2026-07-01', end: '2026-07-12', color: accent },
    { name: '假期作业攻坚', start: '2026-07-13', end: '2026-08-05', color: accent2 },
    { name: '高二新课预习', start: '2026-08-01', end: '2026-08-20', color: '#5b8cbd' },
    { name: 'TRAE AI 创造大赛', start: '2026-07-01', end: '2026-08-31', color: '#8b6bae' },
    { name: '收尾调整', start: '2026-08-21', end: '2026-08-31', color: '#d4a843' }
  ];

  // Convert dates to timestamps
  function toTs(dateStr) {
    return new Date(dateStr).getTime();
  }

  var overallStart = toTs('2026-07-01');
  var overallEnd = toTs('2026-08-31');
  var totalRange = overallEnd - overallStart;

  // Build month labels
  var months = [];
  var current = new Date('2026-07-01');
  while (current <= new Date('2026-08-31')) {
    months.push(current.getFullYear() + '-' + String(current.getMonth() + 1).padStart(2, '0') + '-' + String(current.getDate()).padStart(2, '0'));
    current.setDate(current.getDate() + 5);
  }

  var chartDom = document.getElementById('chart-gantt');
  var chart = echarts.init(chartDom, null, { renderer: 'svg' });

  var option = {
    tooltip: {
      appendToBody: true,
      formatter: function(params) {
        var d = params.data;
        return '<strong>' + d.name + '</strong><br/>' + d.start + ' — ' + d.end;
      }
    },
    grid: {
      left: 140,
      right: 40,
      top: 20,
      bottom: 30
    },
    xAxis: {
      type: 'time',
      min: overallStart,
      max: overallEnd,
      axisLabel: {
        fontSize: 11,
        color: muted,
        formatter: function(value) {
          var d = new Date(value);
          return (d.getMonth() + 1) + '/' + d.getDate();
        }
      },
      axisLine: { lineStyle: { color: rule } },
      axisTick: { lineStyle: { color: rule } },
      splitLine: { show: false }
    },
    yAxis: {
      type: 'category',
      data: tasks.map(function(t) { return t.name; }),
      inverse: true,
      axisLabel: {
        fontSize: 12,
        fontWeight: 600,
        color: ink
      },
      axisLine: { show: false },
      axisTick: { show: false }
    },
    series: [{
      type: 'custom',
      renderItem: function(params, api) {
        var categoryIndex = api.value(0);
        var startVal = api.value(1);
        var endVal = api.value(2);
        var colorVal = tasks[categoryIndex] ? tasks[categoryIndex].color : accent;

        var start = api.coord([startVal, categoryIndex]);
        var end = api.coord([endVal, categoryIndex]);
        var height = 22;

        return {
          type: 'rect',
          shape: {
            x: start[0],
            y: start[1] - height / 2,
            width: Math.max(end[0] - start[0], 4),
            height: height
          },
          style: {
            fill: colorVal,
            radius: 4
          }
        };
      },
      encode: {
        x: [1, 2],
        y: 0
      },
      data: tasks.map(function(t, i) {
        return {
          value: [i, toTs(t.start), toTs(t.end)],
          name: t.name,
          start: t.start,
          end: t.end,
          itemStyle: { color: t.color }
        };
      })
    }]
  };

  chart.setOption(option);
  window.addEventListener('resize', function() { chart.resize(); });
})();