angular.module('safeApp').directive("parseDateModelValue", function () {
        return {
            require: 'ngModel',
            link: function (scope, elem, attr, modelCtrl) {
                modelCtrl.$formatters.push(function (modelValue) {
                    return new Date(modelValue);
                })
            }
        }
    });

angular.module('safeApp').directive('validFile', function () {
    return {
        require: 'ngModel',
        link: function (scope, el, attrs, ngModel) {
            el.bind('change', function () {
                scope.$apply(function () {
                    ngModel.$setViewValue(el.val());
                    ngModel.$render();
                });
            });
        }
    }
});