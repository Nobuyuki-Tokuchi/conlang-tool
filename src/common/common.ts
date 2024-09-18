import { Signal } from "solid-js";

export type Data<T> = {
    [P in keyof T]: Signal<T[P]>;
};

export type Methods<T> = {
    update<K extends keyof T>(key: K, value: Exclude<T[K], Function>): void;
    get getters(): T;
}
