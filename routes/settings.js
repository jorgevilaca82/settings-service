var express = require('express');
var router = express.Router();

const { header, body} = require('express-validator');
const { validateSettingDefinition, validateSettingMetadata } = require('../requests/validations')
const auth_app_controller = require('../controllers/auth_app_controller')
const controller = require('../controllers/settings_controller')

const MASTER_KEY = 'xpto';

const checkAppIdHeader = () =>
    header('x-appid')
        .notEmpty()
        .withMessage("Missing X-AppID");

const checkAppPassKeyHeader = () =>
    header('x-passkey')
        .notEmpty()
        .withMessage("Missing X-PassKey");

const checkMasterKeyHeader = () =>
    header('x-masterkey')
        .notEmpty()
        .withMessage("Missing X-MasterKey")
        .equals(MASTER_KEY);

const checkAppName = () =>
    body('name')
        .notEmpty().withMessage('Should not be empty.')
        .isLength({ min: 1, max: 64 }).withMessage("Length should be between 1 and 64 characters.");

router.use(checkAppIdHeader());
router.use(checkAppPassKeyHeader());
router.use(auth_app_controller.identifyApp);
router.use(auth_app_controller.authenticateApp);

router.post("/apps", checkMasterKeyHeader(), checkAppName(), controller.registerNewApp);
router.get('/apps', controller.listAllApps);
router.get('/apps/:appId', controller.getAppDetails);
router.post('/', validateSettingMetadata(), controller.createNEwSettingMetadata);
router.get('/subjects', controller.listAllAppSubjects);
router.get('/subjects/:subject/keys', controller.listAllAppSubjectsSettingKeys);
router.get('/subjects/:subject/:key/meta', controller.showSettingKeyMetadata);
router.post('/define', validateSettingDefinition(), controller.defineNewSetting);
router.get('/:subject_type/:subject_scope', controller.getAllScopedSettings);

module.exports = router;