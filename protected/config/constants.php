<?
define('CONFIG', 'development');

defined('DS')              || define('DS', DIRECTORY_SEPARATOR);
defined('YII_DEBUG')       || define('YII_DEBUG', true);
defined('APP_PATH')        || define('APP_PATH', $_SERVER['DOCUMENT_ROOT'] . 'protected' . DS);
defined('RUNTIME_PATH')    || define('RUNTIME_PATH', APP_PATH . 'runtime' . DS);
defined('MODULES_PATH')    || define('MODULES_PATH', APP_PATH . 'modules' . DS);
defined('LIBRARIES_PATH')  || define('LIBRARIES_PATH', APP_PATH . 'libs' . DS);
defined('YII_TRACE_LEVEL') || define('YII_TRACE_LEVEL',3);