/*global angular */
(function()
{
    'use strict';
    var INIT_PER_PAGE_ITEM = 10,
        myApp;

    myApp = angular.module('myApp',['ngRoute'])
        .value('mode', 'app')
        .value('version', 'v1.0.1');

    myApp.run(function ($templateCache, $http)
    {
        $http.get('partials/show-data.html', { cache: $templateCache });
    });

    myApp.config(['$routeProvider',
    function($routeProvider) {
        $routeProvider.
        when('/showForm', {
            templateUrl: 'partials/show-form.html',
            controller: 'FormCtrl'
        }).
        when('/showData', {
            templateUrl: 'partials/show-data.html',
            controller: 'DataCtrl'
        }).
        otherwise({
            redirectTo: '/showForm'
        });
    }]);


    /**
     * Service to share information between controller.
     * Store the application state
     */
    myApp.service('sharerControllerService', ['$http', function($http) {
        var data = [],
            setActiveUser,
            getActiveUser,
            setCurrentPageNumber,
            getPageNumber,
            setTotalItems,
            getTotalPages,
            setItemsPerPage,
            getItemsPerPage,
            setData,
            getData,
            requestTotalPage,
            requestList,
            reset,
            busy;

        reset = function(){
            sessionStorage.activeUser = '';
            sessionStorage.pagenum = 1;
            sessionStorage.itemsPerPage = INIT_PER_PAGE_ITEM;
            sessionStorage.totalItems = 0;
            sessionStorage.totalPages = 0;
        };

        setActiveUser = function(username)
        {
            sessionStorage.activeUser = username;
        };

        getActiveUser = function()
        {
            return sessionStorage.activeUser;
        };

        setCurrentPageNumber = function(num)
        {
            sessionStorage.pagenum = num;
        };

        getPageNumber = function()
        {
            return sessionStorage.pagenum;
        };

        setTotalItems = function(totalItems)
        {
            if (totalItems < 0)
            {
                sessionStorage.totalItems = 0;
                return;
            }
            sessionStorage.totalItems = totalItems;
        };

        getTotalPages = function()
        {
            var total;
            total = Math.ceil(sessionStorage.totalItems / sessionStorage.itemsPerPage) || 1;
            return total;
        };

        setItemsPerPage = function(n)
        {
            sessionStorage.itemsPerPage = n;
        };

        getItemsPerPage = function()
        {
            return sessionStorage.itemsPerPage;
        };

        setData = function(newObj) {
            data = newObj;
        };

        getData = function(){
            return data;
        };


        /**
         * Do a request to get the number of public repositories registered on this user's account.
         * @param activeUser User or organisation we want to know the number of pages about
         * @param cb Callback to be called after a successful call
         */
        requestTotalPage = function(activeUser, cb)
        {
            var urlInfo;

            // Request info header + just one page to reduce the amount of data sent back by the server
            urlInfo = 'https://api.github.com/search/repositories?q=+user:' + activeUser + '&page=1&per_page=1';

            $http({
                method: 'GET',
                url: urlInfo
            }).then(function successCallback(response)
            {
                var totalPages;
                totalPages = 0;
                if (!response.data)
                {
                    totalPages = 0;
                }
                else
                {
                    totalPages = response.data.total_count;
                }

                cb && cb(totalPages);

            }, function errorCallback(response)
            {
                console.log(response);
            });

        };


        /**
         * Do a request to the server to retrieve list of repos.
         * @param currentPage Page number we want to retrieve
         * @param itemsPerPage Maximum number of items to be displayed on the page
         * @param sort Sort by popularity (=stars), forks or updated
         * @param order Descending or ascending
         * @param search Filter
         * @param cbSuccess Callback to call in case of success
         * @param cbError Callback to call in case of failure
         */
        requestList = function(currentPage, itemsPerPage, sort, order, search, cbSuccess, cbError)
        {
            var
                username,
                urlData,
                suffix,
                suggestedMessage;

            if (busy)
            {
                return ;
            }

            busy = true;

            username = this.getActiveUser();
            suffix = '&per_page=' + itemsPerPage +
                '&sort=' + sort +
                '&order=' + order;

            urlData = 'https://api.github.com/users/' + username + '/repos?page=' + currentPage + suffix;

            if (search)
            {
                urlData = 'https://api.github.com/search/repositories?';
                urlData += '&q=' + search;
                urlData += '+in:name,description';      // => Default value
                urlData += suffix;
            }

            $http({
                method: 'GET',
                url: urlData
            }).then(function successCallback(response)
            {
                if (!response)
                {
                    suggestedMessage = 'Server has sent back an invalid answer';
                    cbError && cbError(response, suggestedMessage);
                    return;
                }

                if (search)
                {
                    // Let Angular handle the filtering in case of no result from the server
                    if (!response.data || !response.data.items || !response.data.items.length)
                    {
                        return ;
                    }
                    cbSuccess && cbSuccess(response.data.items);
                }
                else
                {
                    cbSuccess && cbSuccess(response.data);
                }

            }, function errorCallback(response)
            {
                suggestedMessage = 'Error while trying to retrieve data for user -' + username + '-';
                cbError && cbError(response, suggestedMessage);
            }).finally(function ()
            {
                busy = false;
            });

        };



        return {
            setActiveUser: setActiveUser,
            getActiveUser: getActiveUser,
            setData: setData,
            getData: getData,
            setCurrentPageNumber: setCurrentPageNumber,
            getCurrentPageNumber: getPageNumber,
            setTotalItems: setTotalItems,
            getTotalPages: getTotalPages,
            setItemsPerPage: setItemsPerPage,
            getItemsPerPage: getItemsPerPage,
            requestTotalPage: requestTotalPage,
            requestList: requestList,
            reset: reset
        };

    }]);



    // =================================================================
    // Key press event
    // =================================================================
    myApp.directive('customEnter', function ()
    {
        return function (scope, element, attrs)
        {
            element.bind("keydown keypress", function (event)
            {
                if(event.which === 13)
                {
                    scope.$apply(function ()
                    {
                        scope.$eval(attrs.customEnter);
                    });

                    event.preventDefault();
                }
            });
        };
    });


    // =================================================================
    // Form controller
    // =================================================================
    myApp.controller('FormCtrl', ['$scope', '$rootScope', '$http', '$location', 'sharerControllerService', function($scope, $rootScope, $http, $location, sharerControllerService)
    {
        // -------------------------------------------------------
        // Initialisation
        // -------------------------------------------------------
        $scope.username = '';
        $scope.idCtrl = 'FormCtrl';

        $scope.send = function()
        {
            $scope.username = $scope.username.trim();
            if (!$scope.username)
            {
                $scope.message = 'Field username cannot be empty';
                return ;
            }

            $scope.message = 'Submitting...';

            sharerControllerService.requestTotalPage($scope.username, function(totalPages)
            {
                sharerControllerService.reset();
                sharerControllerService.setActiveUser($scope.username);

                sharerControllerService.setTotalItems(totalPages);

                $rootScope.$broadcast('refreshTitleEvent', {});
                $location.path('/showData');
            });

        };
    }]);


    // =================================================================
    // Data controller (Table)
    // =================================================================
    myApp.controller('DataCtrl', ['$scope', '$rootScope', '$http', '$location', '$timeout', 'sharerControllerService',
        function($scope, $rootScope, $http, $location, $timeout, sharerControllerService)
    {
        var editData,
            showError,
            timerId,
            busyUpdating;
        $scope.idCtrl = 'DataCtrl';

        // -------------------------------------------------------
        // Requirements
        // -------------------------------------------------------
        if (!sharerControllerService)
        {
            $location.path('/showForm');
            return;
        }

        if (!sharerControllerService.getActiveUser())
        {
            $location.path('showForm');
            return;
        }

        $rootScope.$broadcast('refreshTitleEvent', {});
        if (!sharerControllerService.getTotalPages())
        {
            $scope.data = [];
            $scope.message = 'No public repository detected';
            return;
        }

        // -------------------------------------------------------
        // Initialisation
        // -------------------------------------------------------
        busyUpdating = false;

        $scope.perpageitems = sharerControllerService.getItemsPerPage() || INIT_PER_PAGE_ITEM;
        $scope.pagenumber = sharerControllerService.getCurrentPageNumber() || 1;
        $scope.items = sharerControllerService.getData();
        $scope.sort = 'stars';
        $scope.order = 'desc';
        $scope.search = '';

        editData = function(data){
            $scope.items = data;
            sharerControllerService.setData(data);
            sharerControllerService.setCurrentPageNumber($scope.pagenumber);
            sharerControllerService.setItemsPerPage($scope.perpageitems);

            $scope.totalPages = sharerControllerService.getTotalPages();
            busyUpdating = false;
        };

        showError = function(err, suggestedMessage){
            $scope.message = suggestedMessage;
            busyUpdating = false;
        };

        $scope.updating = function(){
            return busyUpdating;
        };

        $scope.update = function(delay){
            busyUpdating = true;
            if (!delay)
            {
                sharerControllerService.requestList(
                    $scope.pagenumber, $scope.perpageitems,
                    $scope.sort, $scope.order, $scope.search,
                    editData, showError
                );
            }
            else
            {
                if (timerId)
                {
                    $timeout.cancel(timerId);
                }

                timerId = $timeout(function()
                {
                    sharerControllerService.requestList(
                        $scope.pagenumber, $scope.perpageitems,
                        $scope.sort, $scope.order, $scope.search,
                            editData, showError
                    );
                }, delay);
            }
        };

        $scope.fastReward = function(){
            $scope.pagenumber = 1;
        };

        $scope.previous = function(){
            if ($scope.pagenumber <= 1)
            {
                return ;
            }

            --$scope.pagenumber;
            $scope.update(500);
        };

        $scope.next = function(){
            if ($scope.pagenumber >= sharerControllerService.getTotalPages())
            {
                return ;
            }

            ++$scope.pagenumber;
            $scope.update(500);
        };

        $scope.update();

    }]);


    // =================================================================
    // Nav. controller (NavBar)
    // =================================================================
    myApp.controller('NavCtrl', ['$scope', '$location', 'sharerControllerService', function($scope, $location, sharerControllerService)
    {
        // -------------------------------------------------------
        // Initialisation
        // -------------------------------------------------------
        $scope.focusname = '';
        $scope.$on('refreshTitleEvent', function(event, args)
        {
            $scope.focusname = sharerControllerService.getActiveUser();
        });
    }]);


    // Use [[ ]] instead of {{ }} for compatibility with Handlebars
    //angular.module('myApp', ['flash', 'ngAnimate'], ['$interpolateProvider', function($interpolateProvider) {
    //    $interpolateProvider.startSymbol('[[');
    //    $interpolateProvider.endSymbol(']]');
    //}]
    //);



}());
