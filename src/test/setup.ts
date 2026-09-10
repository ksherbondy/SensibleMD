import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { installDomPolyfills, resetDomPolyfills } from "./dom-polyfills";

installDomPolyfills();

afterEach(() => {
  cleanup();
  resetDomPolyfills();
  window.sensibleMD = undefined;
  localStorage.clear();
});
