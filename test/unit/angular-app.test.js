/**
 * Created by thimpat on 19/11/2015.
 */

(function()
{
    'use strict';

    describe('MyApp', function () {

        var
            myApp,
            $controller;
        beforeEach(function(){
            myApp = angular.mock.module('myApp');
        });

        it('should provide a version', inject(function(mode, version) {
            expect(version).toEqual('v1.0.1');
            expect(mode).toEqual('app');
        }));

        beforeEach(angular.mock.inject(function(_$controller_){
            $controller = _$controller_;
        }));

        describe('User form', function () {

            it('should not be submitted when username input field is empty', function(){
                var $scope, controller;
                $scope = {};
                controller = $controller('FormCtrl', { $scope: $scope });
                $scope.username = '';
                $scope.submit();
                expect($scope.message).toBeDefined();
            });

            it('should go to next page when username is valid', inject(function($httpBackend) {

                var $scope, controller, url;
                $scope = {};
                url = 'https://api.github.com/users/thimpat/repos?page=1&per_page=4';
                controller = $controller('FormCtrl', { $scope: $scope });
                $scope.username = 'thimpat';

                // Mock http request
                $httpBackend
                    .when('GET', url)
                    .respond(200, [{ "id": 123456789 }]);

                $httpBackend
                    .expect('GET', url);

                $scope.submit();

                expect($httpBackend.flush).not.toThrow();
                expect($scope.submitted).toBe(true);

            }));

        });

    });
}());