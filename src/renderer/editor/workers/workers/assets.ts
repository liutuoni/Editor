import "../../../module";

import { IStringDictionary } from "../../../../shared/types";

import {
	Engine, Scene, SceneLoader, TargetCamera, Vector3, CubeTexture,
	DirectionalLight, ShadowGenerator, Mesh, Material,
} from "babylonjs";

import { GridMaterial } from "babylonjs-materials";
import "babylonjs-loaders";

import { Tools } from "../../tools/tools";

import { FBXLoader } from "../../loaders/fbx/loader";
import { basename, dirname, join } from "path";
import { readJSON } from "fs-extra";

export default class AssetsWorker {
	private _scene: Scene;
	private _engine: Engine;
	private _camera: TargetCamera;

	private _ground: Mesh;

	private _light: DirectionalLight;
	private _shadowGenerator: ShadowGenerator;

	private _isBusy: boolean = false;

	private _cachedPreviews: IStringDictionary<string> = {};

	/**
	 * Constructor.
	 * @param canvas defines the reference to the canvas used to render the scene.
	 */
	public constructor(canvas: HTMLCanvasElement) {
		this._engine = new Engine(canvas, true, {
			audioEngine: false,
			powerPreference: "high-performance",
		});

		this._scene = new Scene(this._engine);
		this._scene.clearColor.set(0, 0, 0, 1);

		this._camera = new TargetCamera("AssetsWorkerCamera", Vector3.Zero(), this._scene, true);

		// Light
		this._light = new DirectionalLight("AssetsWorkerDirectionalLight", Vector3.Zero(), this._scene);
		this._shadowGenerator = new ShadowGenerator(1024, this._light, false);

		// Environment
		const environmentTexture = CubeTexture.CreateFromPrefilteredData("../../../../../assets/textures/studio.env", this._scene);
		this._scene.environmentTexture = environmentTexture;

		// Ground
		this._ground = Mesh.CreateGround("AssetsWorkerGround", 1, 1, 1, this._scene, false);
		this._ground.receiveShadows = true;

		// Ground material
		const groundMaterial = new GridMaterial("AssetsWorkerGridMaterial", this._scene);
		groundMaterial.majorUnitFrequency = 6;
		groundMaterial.minorUnitVisibility = 0.43;
		groundMaterial.gridRatio = 0.5;
		groundMaterial.mainColor = new BABYLON.Color3(0.35, 0.35, 0.35);
		groundMaterial.lineColor = new BABYLON.Color3(1, 1, 1);
		groundMaterial.backFaceCulling = false;
		this._ground.material = groundMaterial;

		// Loaders
		SceneLoader.RegisterPlugin(new FBXLoader(false));
	}

	/**
	 * Loads the material located at the given absolute path and returns its preview image.
	 * @param absolutePath defines the absolute path to the material file.
	 * @param rootUrl defines the rootUrl the files are relative to.
	 */
	public async createMaterialPreview(absolutePath: string, rootUrl: string): Promise<string> {
		if (this._cachedPreviews[absolutePath]) {
			return this._cachedPreviews[absolutePath];
		}

		await this._waitQueue();

		if (this._cachedPreviews[absolutePath]) {
			return this._cachedPreviews[absolutePath];
		}

		this._isBusy = true;

		const parsedData = await readJSON(absolutePath, { encoding: "utf-8" });
		if (parsedData.customType === "BABYLON.NodeMaterial") {
			rootUrl = undefined!;
		}

		const material = Material.Parse(parsedData, this._scene, rootUrl);

		const sphere = Mesh.CreateSphere("AssetsWorkerSphere", 32, 10, this._scene, false);
		sphere.material = material;

		await this._waitPendingData();

		this._shadowGenerator.addShadowCaster(sphere, false);
		this._setupDecoration();

		this._scene.render();

		this._shadowGenerator.removeShadowCaster(sphere, false);

		material?.dispose(true, true);
		sphere.dispose(true, false);

		const result = await this._convertCanvasToBase64();

		this._isBusy = false;
		this._cachedPreviews[absolutePath] = result;

		return result;
	}

	/**
	 * Loads the scene located at the given absolute path and returns its preview image.
	 * @param absolutePath defines the absolute path to the scene file.
	 */
	public async createScenePreview(absolutePath: string): Promise<string> {
		if (this._cachedPreviews[absolutePath]) {
			return this._cachedPreviews[absolutePath];
		}

		await this._waitQueue();

		if (this._cachedPreviews[absolutePath]) {
			return this._cachedPreviews[absolutePath];
		}

		this._isBusy = true;

		try {
			const rootUrl = join(dirname(absolutePath), "/");
			const filename = basename(absolutePath);

			const container = await SceneLoader.LoadAssetContainerAsync(rootUrl, filename, this._scene);
			container.addAllToScene();

			await this._waitPendingData();

			this._setupDecoration();

			container.meshes.forEach((m) => {
				this._shadowGenerator.addShadowCaster(m, false);
			});

			this._scene.render();

			container.meshes.forEach((m) => {
				this._shadowGenerator.removeShadowCaster(m);
			});

			container.removeAllFromScene();
			container.dispose();

		} catch (e) {
			// Catch silently.
		}

		const result = await this._convertCanvasToBase64();

		this._isBusy = false;
		this._cachedPreviews[absolutePath] = result;

		return result;
	}

	/**
	 * Waits the current queue.
	 */
	private async _waitQueue(): Promise<void> {
		while (this._isBusy) {
			await Tools.Wait(500);
		}
	}

	/**
	 * Waits until all pending data are loaded.
	 */
	private _waitPendingData(): Promise<void> {
		return new Promise<void>(async (resolve, reject) => {
			const timeoutId = setTimeout(async () => {
				reject();
			}, 10000);

			while (this._scene._pendingData.length) {
				await Tools.Wait(150);
			}

			clearTimeout(timeoutId);

			resolve();
		});
	}

	/**
	 * Setups decoration for the scene to render (light, ground, etc.).
	 */
	private _setupDecoration(): void {
		const minimum = new Vector3(Number.MAX_VALUE, Number.MAX_VALUE, Number.MAX_VALUE);
		const maximum = new Vector3(Number.MIN_VALUE, Number.MIN_VALUE, Number.MIN_VALUE);

		this._scene.meshes.forEach((d) => {
			if (d === this._ground) {
				return;
			}

			const scaling = Vector3.Zero();
			d.getWorldMatrix().decompose(scaling, undefined, undefined);

			const bMinimum = d._boundingInfo?.minimum.multiply(scaling);
			const bMaximum = d._boundingInfo?.maximum.multiply(scaling);

			if (!bMinimum || !bMaximum) { return; }

			maximum.x = Math.max(bMaximum.x, maximum.x);
			maximum.y = Math.max(bMaximum.y, maximum.y);
			maximum.z = Math.max(bMaximum.z, maximum.z);

			minimum.x = Math.min(bMinimum.x, minimum.x);
			minimum.y = Math.min(bMinimum.y, minimum.y);
			minimum.z = Math.min(bMinimum.z, minimum.z);
		});

		const center = Vector3.Center(minimum, maximum);
		const distance = Vector3.Distance(minimum, maximum) * 0.5;

		this._camera.position = center.add(new Vector3(distance, distance, distance));
		this._camera.setTarget(center);

		this._light.position.copyFrom(maximum);
		this._light.setDirectionToTarget(center);

		const maxGroundValue = Math.max(
			(maximum.x - minimum.x) * 10,
			(maximum.z - minimum.z) * 10,
		);

		this._ground.position.y = minimum.y;
		this._ground.scaling.setAll(maxGroundValue);
	}

	/**
	 * Converts the current canvas blob result to a readable object Url.
	 */
	private async _convertCanvasToBase64(): Promise<string> {
		const canvas = this._engine.getRenderingCanvas() as unknown as OffscreenCanvas;

		const blob = await canvas.convertToBlob({ type: "image/png" });
		return URL.createObjectURL(blob);
	}
}
