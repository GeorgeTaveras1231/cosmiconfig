import fs from 'node:fs/promises';
import path from 'node:path';
import { isDirectory } from 'path-type';
import { ExplorerBase, getExtensionDescription } from './ExplorerBase';
import { loadJson } from './loaders';
import { Config, CosmiconfigResult, ExplorerOptions } from './types';
import { emplace, getPropertyByPath } from './util';

export class Explorer extends ExplorerBase<ExplorerOptions> {
  public constructor(options: ExplorerOptions) {
    super(options);
  }

  public async load(filepath: string): Promise<CosmiconfigResult> {
    filepath = path.resolve(filepath);

    const load = async (): Promise<CosmiconfigResult> => {
      return await this.config.transform(
        await this.#readConfiguration(filepath),
      );
    };
    if (this.loadCache) {
      return await emplace(this.loadCache, filepath, load);
    }
    return await load();
  }

  #loadingMetaConfig = false;
  public async search(from = ''): Promise<CosmiconfigResult> {
    if (this.config.metaConfigFilePath) {
      this.#loadingMetaConfig = true;
      const config = await this.load(this.config.metaConfigFilePath);
      this.#loadingMetaConfig = false;
      if (config && !config.isEmpty) {
        return config;
      }
    }

    const stopDir = path.resolve(this.config.stopDir);
    from = path.resolve(from);
    const search = async (): Promise<CosmiconfigResult> => {
      /* istanbul ignore next -- @preserve */
      if (await isDirectory(from)) {
        for (const place of this.config.searchPlaces) {
          const filepath = path.join(from, place);
          try {
            const result = await this.#readConfiguration(filepath);
            if (
              result !== null &&
              !(result.isEmpty && this.config.ignoreEmptySearchPlaces)
            ) {
              return await this.config.transform(result);
            }
          } catch (error) {
            if (error.code === 'ENOENT' || error.code === 'EISDIR') {
              continue;
            }
            throw error;
          }
        }
      }
      const dir = path.dirname(from);
      if (from !== stopDir && from !== dir) {
        from = dir;
        if (this.searchCache) {
          return await emplace(this.searchCache, from, search);
        }
        return await search();
      }
      return null;
    };

    if (this.searchCache) {
      return await emplace(this.searchCache, from, search);
    }
    return await search();
  }

  async #readConfiguration(filepath: string): Promise<CosmiconfigResult> {
    const contents = await fs.readFile(filepath, { encoding: 'utf-8' });
    let config = await this.#loadConfiguration(filepath, contents);
    if (config === null) {
      return null;
    }
    if (config === undefined) {
      return { filepath, config: undefined, isEmpty: true };
    }
    if (
      this.config.applyPackagePropertyPathToConfiguration ||
      this.#loadingMetaConfig
    ) {
      config = getPropertyByPath(config, this.config.packageProp);
    }
    if (config === undefined) {
      return { filepath, config: undefined, isEmpty: true };
    }
    return { config, filepath };
  }

  async #loadConfiguration(
    filepath: string,
    contents: string,
  ): Promise<Config> {
    if (contents.trim() === '') {
      return;
    }

    if (path.basename(filepath) === 'package.json') {
      return (
        getPropertyByPath(
          loadJson(filepath, contents),
          this.config.packageProp,
        ) ?? null
      );
    }

    const extension = path.extname(filepath);
    try {
      const loader =
        this.config.loaders[extension || 'noExt'] ??
        this.config.loaders['default'];
      if (loader !== undefined) {
        // eslint-disable-next-line @typescript-eslint/return-await
        return await loader(filepath, contents);
      }
    } catch (error) {
      error.filepath = filepath;
      throw error;
    }
    throw new Error(
      `No loader specified for ${getExtensionDescription(extension)}`,
    );
  }
}
