import React from "react";

export const XTerm = ({ children, ...props } = {}) =>
  React.createElement("div", { ...props, "data-stub": "xterm" }, children);

export default { XTerm };
