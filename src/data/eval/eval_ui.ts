import type { UI } from "../uiConfigTypes";

const eval_ui: UI = {
    template: "template.txt",
    fragments: {
        ex1: "ex1.txt",
        ex2: "ex2.txt",
        ex3: "ex3.txt"
    },
    colors: { 
        c1: ["#6f1d1b", "#ffe6a7", "#ffe6a7", "#000000"],
        c2: ["#99582a", "#ffe6a7", "#ffe6a7", "#000000"],
        c3: ["#432818", "#ffe6a7", "#ffe6a7", "#000000"],
        c4: ["#bb9457", "#000000", "#ffffff", "#000000"],
        c5: ["#ffe6a7", "#000000", "#ffffff", "#000000"],
        bg: ["#432818", "#d8d8d8", "#ffffff", "#000000"]
    },
    ui: {
        topbar: {
            header: false,
            fixed: true,
            color: "c1",
            components: [
                {
                    label: "Employee Name",
                    ref: "employee_name",
                    type: "textinput",
                    required: true,
                },
                {
                    label: "Gender Pronouns",
                    ref: "pronouns",
                    type: "dropdown",
                    required: true,
                    default: null,
                    options: ["he/him", "she/her", "they/them"],
                }
            ]
        },
        collegeservices: {
            header: "College Services",
            fixed: false,
            color: "c3",
            components: [
                {
                    label: "List College Services",
                    ref: "student_services",
                    type: "textarea",
                    required: true
                },
                {
                    label: "College Services Strengths",
                    ref: "college_service_strengths",
                    type: "textarea",
                    required: true
                },
                {
                    label: "College Services Areas for Improvement",
                    ref: "college_service_improvements",
                    type: "textarea",
                    required: false
                }
            ]
        },
        workperformance: {
            header: "Work Performance",
            fixed: false,
            color: "c2",
            components: [
                {
                    label: "List Work Accomplishments",
                    ref: "work_accomplishments",
                    type: "textarea",
                    required: false
                },
                {
                    label: "Work Performance Strengths",
                    ref: "work_performance_strengths",
                    type: "textarea",
                    required: true
                },
                {
                    label: "Work Performance Areas for Improvement",
                    ref: "work_performance_improvements",
                    type: "textarea",
                    required: false
                }
            ]
        },
        overall: {
            header: "Overall",
            fixed: false,
            color: "c4",
            components: [
                {
                    label: "Overall/Notes",
                    ref: "overall_notes",
                    type: "textarea",
                    required: false
                }
            ]
        }
    }
};

export default eval_ui;