import { installPaginationGeometry, resetPageGeometry, ControlledResizeObserver } from "./pagination-geometry";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { installDomPolyfills, resetDomPolyfills } from "./dom-polyfills";

installDomPolyfills();
installPaginationGeometry();

afterEach(() => {
  cleanup();
  resetDomPolyfills();
  resetPageGeometry();
  ControlledResizeObserver.instances.length = 0;
  window.sensibleMD = undefined;
  localStorage.clear();
});
