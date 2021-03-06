'use strict';
angular.module('resCenWechatModule', ['resCtrModalModule'])

.controller('resCenWechatMainCtrl', ['$scope', '$q', '$interval', '$state', '$location', '$modal', 'resCtrModalService', 'initComDataService', 'resourceCenterService', 'trsspliceString', 'trsconfirm', 'leftService', 'dateFilter', 'globleParamsSet', 'trsHttpService', '$timeout', 'trsPrintService', 'storageListenerService',
    function($scope, $q, $interval, $state, $location, $modal, resCtrModalService, initComDataService, resourceCenterService, trsspliceString, trsconfirm, leftService, dateFilter, globleParamsSet, trsHttpService, $timeout, trsPrintService, storageListenerService) {

        var listparams = {};
        var typeName = leftService.getParamValue('typename');
        var nodeId = leftService.getParamValue('nodeid');
        var nodename = leftService.getParamValue('nodename');
        var channel = leftService.getCurChannel();
        var channelName = leftService.resNavValue[channel];
        if (!nodeId) {
            return false;
        }
        var vm = $scope.vm = {
            loadingBusy: false,
            channelName: channelName,
            typeName: typeName,
            contents: {},
            isAllchecked: false,
            numberOfNewDocs: 0,
            showbutton: false,
            searchparams: {},
            suggestResult: "",
            suggestContentList: [],
            page: {
                totalNum: 0,
                pagenumber: 1,
                pagesize: globleParamsSet.setResourceCenterPageSize,
                PAGESIZE: globleParamsSet.setResourceCenterPageSize,
            }
        };

        $scope.opDisabled = true;
        listparams = {
            "serviceid": channelName,
            "channelName": channelName,
            "typeName": typeName,
            "nodeId": nodeId
        };

        // 提交设置的字段
        $scope.setColumns = function() {
            var saveIds = [],
                deleteIds = [];
            angular.forEach($scope.fields, function(n, i) {
                if (n.isSelect == 1 && n.isChecked == false) {
                    deleteIds.push(n.id);
                }
                if (n.isSelect == 0 && n.isChecked == true) {
                    saveIds.push(n.id);
                }
            });
            // 提交设置字段
            resourceCenterService.operationSummarys({
                "saveIds": saveIds.join(","),
                "deleteIds": deleteIds.join(","),
                "tableEnName": $scope.page.indexName
            }).then(function(data) {
                if (data.result == "success") {
                    getListbyItem(listparams);
                }
            });
        };


        function initStatus() {
            $scope.status = {
                position: {
                    iwo: '0',
                    newspaper: '1',
                    website: '2'
                },
                batchOperateBtn: {
                    "hoverStatus": "",
                    "clickStatus": ""
                }
            };
            var timer = $interval(function() {
                if (!vm.page.maxId) return;
                var params = {
                    "serviceid": channelName,
                    channelName: channelName,
                    typeName: typeName,
                    nodeId: nodeId,
                    maxId: vm.page.maxId
                };
                var keyword = {};
                keyword = initkeyword();
                params.keyword = JSON.stringify(keyword);
                resourceCenterService.getPageInfobyItem(params).then(function(data) {
                    vm.numberOfNewDocs = data.number;
                }, function() {
                    console.log("Get UnreadNumber Failed");
                });
            }, 1000 * 60);

            $scope.$on("$destroy", function() {
                $interval.cancel(timer);
            });

            resourceCenterService.getListDownData(angular.copy(listparams), "time", function(data) {
                vm.time = {
                    data: data,
                    curValue: data[0]
                };
            });
            resourceCenterService.getListDownData(angular.copy(listparams), "reliablelevel", function(data) {
                vm.sourcelevel = {
                    data: data,
                    curValue: data[0]
                };
            });

        }

        var getListbyItem = function(preparams, pageNum, pageSize, account) {
            var time = $scope.time && ($scope.time.curValue.value == "custom" ? [dateFilter($scope.time.curValue.startdate, 'yyyy-MM-dd'), dateFilter($scope.time.curValue.enddate, 'yyyy-MM-dd')].join(',') : $scope.time.curValue.CNNAME);
            var params = angular.copy(preparams);
            vm.jumpToPageNum = params.pageNum = vm.page.pagenumber = pageNum ? pageNum : vm.page.pagenumber;
            params.pageSize = vm.page.pagesize = pageSize ? pageSize : vm.page.pagesize;
            var keyword = {};
            keyword = initkeyword();
            params.keyword = JSON.stringify(keyword);
            $scope.loadingPromise = resourceCenterService.getListbyItem(params).then(function(data) {
                vm.contents = data.content;
                vm.page = angular.extend(vm.page, data.summary_info);
                vm.tableheaders = vm.page.hybaseField;
                if (vm.tableheaders) {
                    $scope.IsHeadersShow = true;
                }
                if (vm.contents.length > 0) {
                    getTags(vm.contents);
                }

            }, function() {
                console.log("Get Navigation Failed");
            });
        };

        var initkeyword = function() {
            var keyword = {};
            keyword.keywords = vm.filterKeyWord ? vm.filterKeyWord : "";
            keyword.menuscriptType = vm.docType && vm.docType.curValue.value;
            keyword.reliablelevel = vm.sourcelevel && vm.sourcelevel.curValue.value;
            keyword.time = vm.time ? vm.time.curValue.value == "custom" ? [dateFilter(vm.time.curValue.startdate, 'yyyy-MM-dd'), dateFilter(vm.time.curValue.enddate, 'yyyy-MM-dd')].join(',') : vm.time.curValue.value : "";
            keyword.hasImage = vm.showbutton ? "1" : "";
            keyword = angular.extend(keyword, {
                area: vm.searchparams.area && vm.searchparams.area.join(",") || "",
                zyzxfield: vm.searchparams.zyzxfield && vm.searchparams.zyzxfield.join(",") || "",
                account: vm.searchparams.account && vm.searchparams.account.join(",") || ""
            });
            return keyword;
        }

        var getTags = function(contents) {
            var docIds = trsspliceString.getArrayString(contents, 'ZB_GUID', ',');
            var params = {
                channelName: channelName,
                typeName: typeName,
                nodeId: nodeId,
                guids: docIds
            };
            resourceCenterService.getTags(params).then(function(data) {
                angular.forEach(contents, function(content) {
                    var id = content.ZB_GUID;
                    angular.forEach(data, function(item) {
                        if (item.GUID == id) {
                            content.QU = item.OPERFLAG.substr(0, 1) == 1 ? true : false;
                            content.QIAN = item.OPERFLAG.substr(1, 1) == 1 ? true : false;
                            content.JIAN = item.OPERFLAG.substr(2, 1) == 1 ? true : false;
                            content.CHE = item.OPERFLAG.substr(3, 1) == 1 ? true : false;
                            content.CHONG = item.OPERFLAG.substr(4, 1) == 1 ? true : false;
                        }
                    });
                });
                getImgList();
            });
        };

        var getImgList = function() {
            var docIds = trsspliceString.spliceString(vm.contents, "ZB_GUID", ",");
            if (docIds) {
                var params = {
                    typeid: "zyzx",
                    modelid: "getImgList",
                    serviceid: channelName,
                    channelName: channelName,
                    guids: docIds
                };
                trsHttpService.httpServer(trsHttpService.getBigDataRootUrl(), params, "post").then(function(data) {
                    if (data.result == "success") {
                        var temp = data.content[0];
                        var arr = angular.copy(vm.contents);
                        angular.forEach(arr, function(value, key) {
                            value.imgurl = temp[value.ZB_GUID] && temp[value.ZB_GUID].IMAGEURLS;
                        });
                        $timeout(function() {
                            vm.contents = arr
                        }, 0);
                    }
                });
            }
        };

        var getUnreadDocs = function(params) {
            resourceCenterService.getPageInfobyItem(params).then(function(data) {
                vm.numberOfNewDocs = data.number;
            }, function() {
                console.log("Get Navigation Failed");
            });
        };

        // 下拉
        $scope.selectPageNum = function() {
            vm.page.pagesize = vm.pagesize;
            $scope.pageChanged();
        };

        $scope.pageChanged = function() {
            getListbyItem(listparams, vm.page.pagenumber, vm.page.pagesize);
        };
        /**
         * [selectPageNum description]单页选择分页条数
         * @return {[type]} [description]
         */
        $scope.selectPageNum = function() {
            getListbyItem(listparams, vm.page.CURRPAGE, vm.page.PAGESIZE);
        };
        $scope.toggleSelectAll = function(isAllchecked) {
            vm.isAllchecked = !isAllchecked;
            angular.forEach(vm.contents, function(item) {
                item.ischecked = vm.isAllchecked;
            });
            setOpDisabled();
        };

        $scope.toggleContent = function(content) {
            var ischecked = content.ischecked = !content.ischecked;
            if (ischecked) {
                var lengthOfchecked = trsspliceString.filter(vm.contents, 'ZB_GUID', 'ischecked', true).length;
                if (lengthOfchecked === vm.contents.length) {
                    vm.isAllchecked = true;
                }
            } else {
                vm.isAllchecked = false;
            }
            setOpDisabled();
        };

        /**
         * [printbtn description]打印
         */
        $scope.printbtn = function() {
            var params = {
                "serviceid": channelName,
                "modelid": "detailData",
                "guid": trsspliceString.spliceString(vm.contents, 'ZB_GUID', ',', 'ischecked', true),
                "channelName": channelName,
                "typeid": "zyzx",
                "indexName": vm.page.indexName,
            }
            $scope.loadingPromise = trsHttpService.httpServer(trsHttpService.getBigDataRootUrl(), params, "post").then(function(data) {
                trsPrintService.trsPrintBigData(data);
            });
        };
        // 取稿
        // $scope.openTakeDraftModal = function() {
        //     var selectItems = trsspliceString.filterArr(angular.copy(vm.contents), 'ZB_GUID', 'ischecked', true);
        //     if (!selectItems.length) {
        //         trsconfirm.alertType("请先选择稿件！", "", "error", false, "");
        //         return false;
        //     }

        //     var takeDraftModal = resCtrModalService.takeDraft(selectItems);
        //     takeDraftModal.result.then(function(result) {

        //         var MetaDataIds = "",
        //             op = result.btnOp,
        //             doctype = "",
        //             position = "",
        //             siteid = result.siteid;
        //         doctype = getDirectEditRouter(result).doctype;
        //         position = getDirectEditRouter(result).position;
        //         var metadataids = trsspliceString.spliceString(result.items, 'ZB_GUID', ',');
        //         var params = {
        //             "channelName": channelName,
        //             "typeName": typeName,
        //             "nodeId": nodeId,
        //             "guid": metadataids,
        //             "indexName": vm.page.indexName,
        //             "ToMy": result.ToMy,
        //             "App": result.App,
        //             "Web": result.Web,
        //             "Paper": result.Paper,
        //             "PaperPubDate": result.PaperPubDate,
        //             "SourceName": "资源中心-微信-" + nodename
        //         };
        //         resourceCenterService.getBigDataFetch(params).then(function(data) {

        //             if (op == 1) {
        //                 var chnldocid = data.REPORTS[0].CHNLDOCID,
        //                     metadataid = data.REPORTS[0].METADATAID;
        //                 getDirectEditParams(position, chnldocid, metadataid, siteid, result).then(function(params) {
        //                     var url = $state.href(doctype, params);
        //                     window.open(url, '_blank');
        //                 });
        //             } else {
        //                 trsconfirm.alertType("", "取稿成功!", "success", false);
        //             }
        //         });
        //     });
        // };
        /**
         * [openTakeDraftModal description]取稿（by wang.jiang）
         * @return {[type]} [description]
         */
        $scope.openTakeDraftModal = function() {
            var selectItems = trsspliceString.filterArr(angular.copy(vm.contents), 'ZB_GUID', 'ischecked', true);
            if (!selectItems.length) {
                trsconfirm.alertType("请先选择稿件！", "", "error", false, "");
                return false;
            }

            var params = {
                "serviceid": "mlf_bigdataexchange",
                "methodname": "fetch",
                "guid": trsspliceString.spliceString(selectItems, "ZB_GUID", ","),
                "channelName": channelName,
                "indexName": vm.page.indexName,
                "nodeId": nodeId
            };
            var isOnlyOne = selectItems.length > 1 ? false : true;
            var modalInstance = resCtrModalService.fullTakeDraft(params, isOnlyOne);
            modalInstance.result.then(function() {
                getListbyItem(listparams, vm.page.pagenumber, vm.page.pagesize);
            }, function() {
                getTags(vm.contents);
                angular.forEach(vm.contents, function(item) {
                    item.ischecked = false;
                });
            });
        };
        //创作轴
        $scope.CreationAxis = function() {
            var docIds = trsspliceString.spliceString(vm.contents, 'ZB_GUID', ',', 'ischecked', true);
            if (!docIds.length) {
                trsconfirm.alertType("请先选择稿件！", "", "error", false, "");
                return false;
            }
            var param = {
                channelName: channelName,
                typeName: typeName,
                nodeId: nodeId,
                "indexName": vm.page.indexName,
                guid: docIds
            }
            resourceCenterService.setBigDataCreation(param).then(function(data) {
                trsconfirm.alertType("该稿件已成功加入创作轴!", "", "success", false);
            });
        };

        // 收藏
        $scope.collect = function() {
            var docIds = trsspliceString.spliceString(vm.contents, 'ZB_GUID', ',', 'ischecked', true);
            if (!docIds.length) {
                trsconfirm.alertType("请先选择稿件！", "", "error", false, "");
                return false;
            }
            var params = {
                channelName: channelName,
                typeName: typeName,
                nodeId: nodeId,
                "indexName": vm.page.indexName,
                guid: docIds
            };
            resourceCenterService.collectBigDataDocs(params).then(function(data) {
                trsconfirm.alertType("收藏成功!", "", "success", false, "");
            });
        };
        /** 导出 */
        $scope.export = function() {
            var ids = trsspliceString.spliceString(vm.contents, 'ZB_GUID', ',', 'ischecked', true);
            if (!ids.length) {
                trsconfirm.alertType("请先选择稿件！", "", "error", false, "");
                return false;
            }
            var params = {
                serviceid: 'mlf_exportword',
                methodname: 'exportBigDataDocs',
                GUIDS: ids,
                CHANNELNAMES: channelName,
                indexName: vm.page.indexName
            }
            $scope.loadingPromise = trsHttpService.httpServer(trsHttpService.getWCMRootUrl(), params, "get").then(function(data) {
                window.open("/wcm/app/file/read_file.jsp?FileName=" + data);
            })
        };
        // 预留
        $scope.openReserveDraftModal = function() {
            var selectItems = trsspliceString.filterArr(angular.copy(vm.contents), 'ZB_GUID', 'ischecked', true);
            if (!selectItems.length) {
                trsconfirm.alertType("请先选择稿件！", "", "error", false, "");
                return false;
            }
            var resCtrModalServiceModal = resCtrModalService.reserveDraft(selectItems);

            resCtrModalServiceModal.result.then(function(result) {
                var metadataids = trsspliceString.spliceString(result.items, 'ZB_GUID', ',');
                var params = {
                    channelName: channelName,
                    typeName: typeName,
                    nodeId: nodeId,
                    guid: metadataids,
                    "indexName": vm.page.indexName,
                    "App": result.App,
                    "Web": result.Web,
                    "Paper": result.Paper,
                    "PaperPubDate": result.PaperPubDate,
                    ToMy: result.ToMy,
                    Delay: result.Delay,
                    "SourceName": "资源中心-微信-" + nodename
                };
                resourceCenterService.delayBigDataFetch(params).then(function(data) {
                    trsconfirm.alertType("预留成功!", "", "success", false, function() {
                        getListbyItem(listparams, vm.page.pagenumber, vm.page.pagesize);
                    });
                }, function() {
                    getListbyItem(listparams, vm.page.pagenumber, vm.page.pagesize);
                });

            });
        };


        $scope.viewBigDataInfo = function(ChnlDocId, showRepeat) {
            var infoModal = resCtrModalService.bigDataInfoModal(ChnlDocId, showRepeat);
        };

        $scope.searchWithKeyword = function() {
            getListbyItem(listparams, 1, vm.page.pagesize);
        }

        $scope.refreshList = function() {
            vm.numberOfNewDocs = 0;
            getListbyItem(listparams, 1, vm.page.pagesize);
        };
        // 显示类型的图片
        $scope.switchImg = function(item, index) {
            item.pos = index > 5 ? true : false;
            $scope.curImg = item.ZB_GUID;
        };

        function setOpDisabled() {
            var docIds = trsspliceString.spliceString(vm.contents, 'ZB_GUID', ',', 'ischecked', true);
            $scope.opDisabled = docIds.length ? false : true;
        };
        if (nodeId) {
            initStatus();
            $scope.pageChanged();
            listenStorage();
        }

        // 显示类型的图片
        $scope.switchImg = function(item, index) {
            item.pos = index > 5 ? true : false;
            $scope.curImg = item.ZB_GUID;
        }
        $scope.reloadData = function(el) {
            var account = el && el.dictid;
            vm.filterKeyWord = "";
            getListbyItem(listparams, vm.jumpToPageNum, vm.page.pagesize, account);
        }

        /** ---------------搜索建议开始-------------- */
        /**
         * [showOperFlag isArrayContain] 判断数组重复性
         * @param  {[type]} list      [数组]
         * @param  {[type]} item      [匹配对象]
         * @return {[type]}           [description]
         */
        function isContain(list, item) {
            var temp = false;
            angular.forEach(list, function(value, key) {
                if (value.dictid == item.dictid) {
                    temp = true;
                    return;
                }
            });
            return temp;
        }
        /** [getSuggestResult 获取搜索建议结果] */
        function getSuggestResult(item) {
            if (item && !isContain(vm.suggestContentList, item)) {
                item.type = item.dicttype == "area" ? "area" : (item.dicttype == "zyzxfield" ? "zyzxfield" : "account");
                vm.suggestContentList.push(item);
                FormatSuggestParams();
                getListbyItem(listparams, 1, vm.page.pagesize)
            }
        }
        /** [FormatSuggestParams 格式化搜索推荐参数] */
        function FormatSuggestParams() {
            var paramObj = {},
                list = vm.suggestContentList;
            if (list.length) {
                angular.forEach(list, function(value, key) {
                    if (!paramObj[value.type]) {
                        paramObj[value.type] = [];
                    }
                    paramObj[value.type].push(value.dictid);
                });
            }
            vm.searchparams = paramObj;
        }
        $scope.getSuggestResult = function(item) {
            vm.filterKeyWord = "";
            getSuggestResult(item);
        };
        /** [removeItem 移除选中的检索词] */
        $scope.removeItem = function(index, list) {
            list.splice(index, 1);
            FormatSuggestParams();
            getListbyItem(listparams, 1, vm.page.pagesize)
        };
        /** ---------------搜索建议结束-------------- */

        /**
         * [listenStorage description]监听本地缓存
         * @return {[promise]} [description] promise
         */
        function listenStorage() {
            storageListenerService.listenResource(function() {
                getListbyItem(listparams, vm.jumpToPageNum);
                storageListenerService.removeListener("resource");
            });
        }
    }
]);
