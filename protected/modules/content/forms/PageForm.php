<?php

return array(
    'activeForm'=>array(
        'id' => 'page-form',
        'class' => 'CActiveForm',
        'enableAjaxValidation' => true,
    ),
    'elements' => array(
        'title'        => array('type' => 'text'),
        'url'          => array('type' => 'alias', 'source'=>'title'),
        'is_published' => array('type' => 'checkbox'),
        'text'         => array('type' => 'editor'),
        'meta_tags'    => array('type' => 'meta_tags')
    ),
    'buttons' => array(
        'submit' => array('type' => 'submit', 'value' => t('сохранить'))
    )
);

