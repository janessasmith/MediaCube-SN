angular.module('trsAddFooterModule', [])
    .directive('footer', [function() {
        return {
            restrict: 'AE',
            template: "<div class='editing_foot'>2016 眉山日报传媒集团 北京拓尔思信息技术股份有限公司  版权所有  保留所有权</div>",
            replace: true,
        };
    }])
