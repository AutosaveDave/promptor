const ui_index = {
    eval: {
        template: "eval/eval_template.txt",
        fragments: {
            example_eval_1: "eval/example_eval1.txt",
            example_eval_2: "eval/example_eval2.txt",
            example_eval_3: "eval/example_eval3.txt"
        },
        colors: {                               // [ backgroundColor, textColor ]
            c1: [ "#ffffff", "#000000" ],
            c2: [ "#000000", "#ffffff" ],
            c3: [ "#808080", "#000000" ],
            bg: [ "#242424", "#d8d8d8"]     // background color of page
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
                        ref: "employee_pronouns",
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
                color: "c2",
                components: [
                    {
                        label: "List College Services",
                        ref: "employee_college_services",
                        type: "textarea",
                        required: true
                    },
                    {
                        label: "College Services Strengths",
                        ref: "employee_college_services_strengths",
                        type: "textarea",
                        required: true
                    },
                    {
                        label: "College Services Areas for Improvement",
                        ref: "employee_college_services_improvement",
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
                        ref: "employee_work_accomplishments",
                        type: "textarea",
                        required: false
                    },
                    {
                        label: "Work Performance Strengths",
                        ref: "employee_work_performance_strengths",
                        type: "textarea",
                        required: true
                    },
                    {
                        label: "Work Performance Areas for Improvement",
                        ref: "employee_work_performance_improvement",
                        type: "textarea",
                        required: false
                    }
                ]
            },
            overall: {
                header: "Overall",
                fixed: false,
                color: "c2",
                components: [
                    {
                        label: "Overall/Notes",
                        ref: "employee_overall",
                        type: "textarea",
                        required: false
                    }
                ]
            }
        }
    }
}

export default ui_index;