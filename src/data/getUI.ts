import eval_ui from "./eval/eval_ui";
import newsletter_ui from "./newsletter/newsletter_ui";
import type { UI } from "./uiConfigTypes"

const ui_index: Record<string, UI> = {
    eval: eval_ui,
    newsletter: newsletter_ui
};
const uiNames: string[] = Object.keys(ui_index);

export const getUI = ( uiName: string ): UI => ui_index[uiName];

export const getUINames = (): string[] => uiNames;