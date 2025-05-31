import type { UI } from "../uiConfigTypes";

const newsletter_ui: UI = {
    template: "template.txt",
    fragments: {
        example_eval_1: "ex1.txt",
        example_eval_2: "ex2.txt",
        example_eval_3: "ex3.txt"
    },
    colors: {
        c1: ["#6f1d1b", "#ffe6a7", "#ffe6a7", "#000000"],
        c2: ["#99582a", "#ffe6a7", "#ffe6a7", "#000000"],
        c3: ["#432818", "#ffe6a7", "#ffe6a7", "#000000"],
        c4: ["#bb9457", "#000000", "#ffffff", "#000000"],
        c5: ["#ffe6a7", "#000000", "#ffffff", "#000000"],
        modal: ["#bb9457", "#000000", "#ffffff", "#000000"],
        bg: ["#432818", "#d8d8d8", "#ffffff", "#000000"]
    },
    ui: {
        topbar: {
            header: "Title",
            fixed: true,
            color: "c1",
            components: [
                {
                    label: "",
                    ref: "article_title",
                    type: "textinput",
                    required: true,
                }
            ]
        },
        description: {
            header: "Description of the Article",
            fixed: false,
            color: "c2",
            components: [
                {
                    label: "",
                    ref: "article_description",
                    type: "textarea",
                    required: true
                }
            ]
        },
        reference: {
            header: "Reference Material for the Article",
            fixed: false,
            color: "c3",
            components: [
                {
                    label: "",
                    ref: "article_reference",
                    type: "textarea",
                    required: false
                }
            ]
        }
    }
};

export default newsletter_ui;