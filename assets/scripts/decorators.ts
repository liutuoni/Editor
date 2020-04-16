import { PointerEventTypes, KeyboardEventTypes } from "@babylonjs/core";

export type VisiblityPropertyType =
    "number" | "string" | "boolean" |
    "Vector2" | "Vector3" | "Vector4";

/**
 * Sets the decorated member visible in the inspector.
 * @param type the property type.
 * @param name optional name to be shown in the editor's inspector.
 */
export function visibleInInspector(type: VisiblityPropertyType, name?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._InspectorValues = ctor._InspectorValues ?? [];
        ctor._InspectorValues.push({
            type,
            name: name ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member linked to a child node.
 * @param nodeName defines the name of the node in children to retrieve.
 */
export function fromChildren(nodeName?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._ChildrenValues = ctor._ChildrenValues ?? [];
        ctor._ChildrenValues.push({
            nodeName: nodeName ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member linked to a node in the scene.
 * @param nodeName defines the name of the node in the scene to retrieve.
 */
export function fromScene(nodeName?: string): any {
    return (target: any, propertyKey: string | symbol) => {
        const ctor = target.constructor;
        ctor._SceneValues = ctor._SceneValues ?? [];
        ctor._SceneValues.push({
            nodeName: nodeName ?? propertyKey.toString(),
            propertyKey: propertyKey.toString(),
        });
    }
}

/**
 * Sets the decorated member function to be called on the given pointer event is fired.
 * @param type the event type to listen to execute the decorated function.
 */
export function onPointerEvent(type: PointerEventTypes): any {
    return (target: any, propertyKey: string | symbol) => {
        if (typeof(target[propertyKey]) !== "function") {
            throw new Error(`Decorated propery "${propertyKey.toString()}" in class "${target.constructor.name}" must be a function.`);
        }

        const ctor = target.constructor;
        ctor._PointerValues = ctor._PointerValues ?? [];
        ctor._PointerValues.push({
            type,
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Sets the decorated member function to be called on the given keyboard key(s) is/are pressed.
 * @param key the key or array of key to listen to execute the decorated function.
 */
export function onKeyboardEvent(key: number | number[], type?: KeyboardEventTypes): any {
    return (target: any, propertyKey: string | symbol) => {
        if (typeof(target[propertyKey]) !== "function") {
            throw new Error(`Decorated propery "${propertyKey.toString()}" in class "${target.constructor.name}" must be a function.`);
        }

        const ctor = target.constructor;
        ctor._KeyboardValues = ctor._KeyboardValues ?? [];
        ctor._KeyboardValues.push({
            type,
            keys: Array.isArray(key) ? key : [key],
            propertyKey: propertyKey.toString(),
        });
    };
}

/**
 * Augmentify global.
 */
declare global {
    export function visibleInInspector(type: VisiblityPropertyType, name?: string): any;
    export function fromChildren(nodeName: string): any;
    export function fromScene(nodeName: string): any;
    export function onPointerEvent(event: PointerEventTypes): any;
    export function onKeyboardEvent(key: number | number[], type?: KeyboardEventTypes): any;
}

(global as any).visibleInInspector = visibleInInspector;
(global as any).fromChildren = fromChildren;
(global as any).fromScene = fromScene;
(global as any).onPointerEvent = onPointerEvent;
(global as any).onKeyboardEvent = onKeyboardEvent;