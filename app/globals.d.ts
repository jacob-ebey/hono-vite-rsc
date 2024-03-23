// biome-ignore lint/style/noVar: globals are var
declare var __vite_preload__: (id: string) => unknown;
// biome-ignore lint/style/noVar: globals are var
declare var __vite_require__: (id: string) => unknown;

// biome-ignore lint/style/noVar: globals are var
declare var $serverManifest: unknown;
// declare var $browserManifest:
// 	| Record<string, { file: string; isEntry: boolean }>
// 	| undefined;

// biome-ignore lint/style/noVar: globals are var
declare var $prerenderManifest: unknown;
// declare var $prerenderManifest: Map<string, string> | undefined;

// biome-ignore lint/style/noVar: globals are var
declare var $assets: {
	chunks: string[];
	entry: string;
};

// biome-ignore lint/style/noVar: globals are var
declare var $server: (request: Request) => Promise<Response>;
