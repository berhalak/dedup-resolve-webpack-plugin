
const defaults = {
	verbose: false,
	modules: {},
	exclude: null,
	path: null,
};

function DedupPlugin(options) {
	this.options = Object.assign({}, defaults, options);
	this.source = "before-described-relative";
	this.cache = this.options.modules;
}

function getCacheId(request) {
	return JSON.stringify({
		module: request.descriptionFileData.name,
		version: request.descriptionFileData.version
	});
}


const is = new RegExp(/.*node_modules/);
function rewrite(from, to) {
	if (from.startsWith(to)) {
		return from;
	}
	return from.replace(is, to);
}

DedupPlugin.prototype.apply = function (resolver) {
	var options = this.options;
	var cache = this.cache;

	resolver.plugin(this.source, function (request, callback) {
		if (request.relativePath !== ".") {
			callback();
			return;
		}
		if (options.exclude && options.exclude(request)) {
			callback();
			return;
		}

		// if no default exclude, omit tslib as it requires more logic
		if (!options.exclude && request.descriptionFileData.name == 'tslib') {
			callback();
			return;
		}

		var cacheId = getCacheId(request);

		var cacheEntry = cache[cacheId];
		if (cacheEntry) {
			if (request.path !== cacheEntry.path) {
				if (options.verbose) {
					console.log("[Dedup]: " + request.path);
					console.log("      => " + cacheEntry.path);
				}
				request.path = cacheEntry.path;
			}
		} else {
			if (options.path) {
				cache[cacheId] = { path: rewrite(request.path, options.path) };
			} else {
				cache[cacheId] = { path: request.path };
			}
		}
		callback();
	});
};

module.exports = DedupPlugin;
