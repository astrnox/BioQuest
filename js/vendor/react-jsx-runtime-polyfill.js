/**
 * ============================================================
 * react/jsx-runtime UMD 兼容层（polyfill）
 * React 18 官方未为 react/jsx-runtime 发布独立 UMD 构建，
 * 但 Excalidraw 0.17.2 UMD 在运行时 require("react/jsx-runtime")，
 * 需要全局变量 window.ReactJSXRuntime 提供 { jsx, jsxs, Fragment }。
 *
 * 本 polyfill 将 jsx/jsxs 转发到 React.createElement。
 * License: MIT（与 React 同源）
 * ============================================================
 */
(function () {
  'use strict';

  function createPolyfill() {
    var React = window.React;
    if (!React || typeof React.createElement !== 'function') {
      console.error('[jsx-runtime-polyfill] window.React 未加载，Excalidraw 将无法渲染');
      return {};
    }

    function jsx(type, props, key) {
      var newProps = props ? Object.assign({}, props) : {};
      if (key !== undefined && key !== null) {
        newProps.key = key;
      }
      return React.createElement(type, newProps);
    }

    function jsxs(type, props, key) {
      return jsx(type, props, key);
    }

    return {
      jsx: jsx,
      jsxs: jsxs,
      Fragment: React.Fragment
    };
  }

  if (window.React) {
    window.ReactJSXRuntime = createPolyfill();
  } else {
    document.addEventListener('readystatechange', function () {
      if (window.React && !window.ReactJSXRuntime) {
        window.ReactJSXRuntime = createPolyfill();
      }
    });
    setTimeout(function () {
      if (window.React && !window.ReactJSXRuntime) {
        window.ReactJSXRuntime = createPolyfill();
      }
    }, 0);
  }
})();
