export type UIComponent = {
    label: string;
    ref: string;
    type: 'textinput' | 'dropdown' | 'textarea';
    required: boolean;
    default?: any;
    options?: string[];
};

export type UISection = {
    header: string | boolean;
    fixed: boolean;
    color: string;
    components: UIComponent[];
};

export type UI = {
    template: string;
    fragments: Record<string, string>;
    colors: Record<string, [string, string, string?, string?]>;
    ui: Record<string, UISection>;
};