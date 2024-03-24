import * as React from "react";
// This installs the module loading runtime and dev HMR runtime
import "rsc-browser-runtime";

import { hydrate } from "./renderers/dom";

React.startTransition(() => {
	hydrate();
});
