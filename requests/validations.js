const { checkSchema } = require('express-validator');

const validateSettingMetadata = () =>
    checkSchema({
        subject: {
            notEmpty: { errorMessage: "Subject is required" },
            isLength: {
                options: { min: 4, max: 32 },
                errorMessage: "Subject lenght is incorrect"
            },
        },
        key: {
            notEmpty: { errorMessage: "Key is required" }
        },
        defaultValue: {
            notEmpty: { errorMessage: "DefaultValue is required" }
        },
        private: {
            isBoolean: { errorMessage: "Private should be boolean" }
        }
    });

// TODO: check if a key already exists with its metadada
const validateSettingDefinition = () =>
    checkSchema({
        subject_type: {
            notEmpty: { errorMessage: "subject_type is required" }
        },
        subject_scope: {
            notEmpty: { errorMessage: "subject_scope is required" }
        },
        value: {
            notEmpty: { errorMessage: "value is required" }
        },
        key: {
            notEmpty: { errorMessage: "key is required" }
        }
    });

module.exports = { validateSettingDefinition, validateSettingMetadata }