<style type="text/css">
    .summary {
        margin-bottom: 10px !important;
        font-size: 11px;
        font-style: italic;
    }
</style>

<?
Yii::app()->clientScript->registerScriptFile('/js/users/index.js');

$this->widget('BootListView', array(
    'dataProvider' => $data_provider,
    'itemView'     => '_view',
    'summaryText'  => 'Показано {start}-{end} из {count}',
    'viewData'     => array(
        'count' => $data_provider->itemCount
    )
))
?>