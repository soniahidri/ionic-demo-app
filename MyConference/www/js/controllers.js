/*
 This file is part of MyConference.

 MyConference is free software: you can redistribute it and/or modify
 it under the terms of the GNU Affero General Public License version 3
 as published by the Free Software Foundation.

 This program is distributed in the hope that it will be useful,
 but WITHOUT ANY WARRANTY; without even the implied warranty of
 MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 GNU Affero General Public License for more details.

 You should find a copy of the GNU Affero General Public License in the
 root directory along with this program.
 If not, see http://www.gnu.org/licenses/agpl-3.0.html.
 */
angular.module('starter.controllers', ['services', 'ngCordova'])
  .controller('AppCtrl', function ($scope, $ionicModal, $timeout, backendService) {

    // With the new view caching in Ionic, Controllers are only called
    // when they are recreated or on app start, instead of every page change.
    // To listen for when this page is active (for example, to refresh data),
    // listen for the $ionicView.enter event:
    //$scope.$on('$ionicView.enter', function(e) {
    //});
    // Form data for the login modal
    $scope.loginData = {};
    // Create the login modal that we will use later
    $ionicModal.fromTemplateUrl('templates/login.html', {
      scope: $scope
    }).then(function (modal) {
      $scope.modal = modal;
    });
    // Triggered in the login modal to close it
    $scope.closeLogin = function () {
      $scope.modal.hide();
    };
    // Open the login modal
    $scope.login = function () {
      $scope.modal.show();
    };
    $scope.isLoggedIn = false;
    $scope.$on('user:loginState', function (event, data) {
      // you could inspect the data to see if what you care about changed, or just update your own scope
      $scope.isLoggedIn = backendService.loginStatus;
      console.log("Login event processed: " + backendService.loginStatus)
    });
  })

  /*
   Controller for starter view
   Shows loading while establishing connection to the backend
   If connection successfully establishes redirects to main view,
   if no shows an error alert and reloads controller
   */
  .controller('StartCtrl', function ($scope, $state, $ionicHistory, $ionicPopup, $ionicLoading, backendService) {
    console.log("Start contorller");
    $ionicLoading.show({
      content: 'Loading',
      animation: 'fade-in',
      showBackdrop: true,
      maxWidth: 200,
      showDelay: 0
    });
    backendService.connect().then(function (res) {
      $ionicLoading.hide();
      $ionicHistory.nextViewOptions({
        disableBack: true
      });
      $state.go('app.main')
    }, function (error) {
      $ionicLoading.hide();
      var alertPopup = $ionicPopup.alert({
        title: 'Connection error',
        template: 'Check your internet connection and try again'
      });
      alertPopup.then(function (re) {
        $state.reload();
      })
    })
  })
 /*
   Controller for forgot password page
   Calls resetPassword service, shows a popup alert about successful  reset of a password
   and redirects to login view

   */
  .controller('ForgotCtrl', function ($scope, $state, backendService, $ionicPopup) {
    $scope.resetPassword = function(user){
      console.log("ctrl "+user.email)
      backendService.resetPassword(user);
      var alertPopup = $ionicPopup.alert({
        title: 'Reset Password',
        template: 'An email has been sent to you with instructions on resetting your password.'
      });
      alertPopup.then(function (re) {
        $state.reload();
      })
    }
  })



  /*
   Controller for transition handling
   redirects to the defined as a parameter state
   */
  .controller('TransitionCtrl', function ($scope, $state, $ionicHistory, $stateParams) {
    $ionicHistory.nextViewOptions({
      disableBack: true
    });
    $state.go($stateParams.to, $stateParams.data)
  })

  /*
   Controller for the Main Page (overview page).
   Gets the events out of the backend by calling the service function.
   Provides the filter methods for previous and next events.
   */
  .controller('MainCtrl', function ($scope, $state, $ionicPopup, backendService) {
    var today = new Date();
    /*
     This method is used for filter after prevoius events in the main view
     */
    $scope.previousEvents = function (item) {
      var itemDate = new Date(item.date);
      return today < itemDate;
    };
    /*
     This method is used for filter after next events in the main view
     */
    $scope.nextEvents = function (item) {
      return !$scope.previousEvents(item);
    };
    backendService.fetchCurrentUser().then(function (res) {
    }, function (error) {
      $state.go('app.start')
    });
    backendService.getEvents().then(function (res) {
      $scope.events = res;
    }, function (reason) {
      console.log("Error detected because of " + reason);
    })
  })

  /*
   Controller for creating an event
   Calls createEvent service, shows a popup alert about successful creation of an event
   and redirects to main view
   */
  .controller('CreateEventCtrl', function ($scope, $state, $ionicPopup, backendService) {
    $scope.createEvent = function (ev) {
      backendService.createEvent(ev);
      var alertPopup = $ionicPopup.alert({
        title: 'Done!',
        template: 'Event "' + ev.title + '" created.'
      });
      alertPopup.then(function (res) {
        $state.go('app.main')
      })
    }
  })

  /*
   Controller for showing event information
   Gets event by its id rom backend, gets agenda file name and download url if it exist
   Contains functions for uploading and downloading a file
   */
  .controller('EventCtrl', function ($scope, $state, $stateParams, backendService, $ionicPlatform, $ionicLoading, $ionicPopup, $cordovaInAppBrowser) {
    $scope.agenda = (typeof $stateParams.agenda !== 'undefined' && $stateParams.agenda != "");
    $scope.upload = false;
    backendService.getEventById($stateParams.eventId).then(function (res) {
      $scope.event = res['data']
      if ($scope.agenda) {
        backendService.getFileDetails(res['data'].fileId).then(function (file) {
          $scope.filename = file['data'].fileName;
          $scope.downloadUrl = backendService.getFileUrl(res['data'].fileId)
        }, function (fileError) {
          console.log("Error by getting file details")
        })
      }
    }, function (error) {
      console.log("Error by retrieving the event", error)
    })
    $(document).on("submit", "#uploadForm", function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      $ionicLoading.show({
        content: 'Loading',
        animation: 'fade-in',
        showBackdrop: true,
        maxWidth: 200,
        showDelay: 0
      });
      var formData = new FormData();
      formData.append('file', $('input[type=file]')[0].files[0])
      backendService.uploadFile(formData, $stateParams.eventId).then(function (res) {
        // if there was already an agenda file then delete it
        if($scope.agenda){
          backendService.deleteFile($stateParams.agenda);
        }
        $ionicLoading.hide();
        $ionicPopup.alert({
          title: 'Done!',
          template: 'File successfully uploaded'
        }).then(function (re) {
          res = jQuery.parseJSON(res);
          $state.go('app.transition', {to: 'app.event', data: {eventId: $stateParams.eventId, agenda: res['data'].id}})
        })
      }, function (error) {
        $ionicLoading.hide();
        $ionicPopup.alert({
          title: 'Error',
          template: 'Error occurred by uploading a file'
        })
      })
    });
    $scope.download = function (url) {
      $ionicPlatform.ready(function () {
        $cordovaInAppBrowser.open(url, '_system')
          .then(function (event) {
            // success
          })
          .catch(function (event) {
            // error
          });
      });
    }
  })

  /*
   Controller for user registration
   First checks if user already logged in, if yes shows alert message and redirects to main view,
   if no calls createAccount service with user form as a parameter
   "default" user means "not registered" user
   */
  .controller('RegisterCtrl', function ($scope, $state, $ionicPopup, backendService) {
    backendService.fetchCurrentUser().then(function (res) {
      if (res['data']['user'].name == "default") {
        backendService.logout();
      } else {
        var alertPopup = $ionicPopup.alert({
          title: 'Done!',
          template: 'You are already logged in'
        });
        alertPopup.then(function (re) {
          $state.go('app.main')
        })
      }
    });
    $scope.createAccount = function (user) {
      backendService.createAccount(user);
      var alertPopup = $ionicPopup.alert({
        title: 'Done!',
        template: 'Welcome, ' + user.name
      });
      alertPopup.then(function (re) {
        $state.go('app.main')
      })
    }
  })

  /* 
   Controller for the Login Page. 
   First logouts the logged in default user, then calls the backend login and shows success/error popup. 
   Goes to Main Page if success, stays on login form but deletes pasword if error. 
   */
  .controller('LoginCtrl', function ($scope, $state, backendService, $ionicPopup) {
    backendService.logout();
    $scope.login = function (credentials) {
      backendService.login(credentials.username, credentials.password).then(
        function (res) {
          $ionicPopup.alert({
            title: 'Done!',
            template: 'Login successful.'
          }).then(function (re) {
            $state.go('app.main');
          });
        },
        function (err) {
          $ionicPopup.alert({
            title: 'Error!',
            template: 'Username and password did not match.'
          });
          credentials.password = "";
        }
      )
    };
  })

  /* 
   Controller for Logout 
   Logouts the user, shows a popup and then goes to main page. 
   */
  .controller('LogoutCtrl', function ($scope, $state, backendService, $ionicPopup) {
    backendService.logout().then(
      function (res) {
        $ionicPopup.alert({
          title: 'Logout',
          template: 'You are logged out.'
        }).then(function (re) {
          $state.go('app.start');
        })
      });
  })

  /*
   Controller for MyAccount view
   First checks if user is "not registered" user
   If yes redirects to login view,
   if no gets username, name, given name and email information about logged user
   */
  .controller('MyAccountCtrl', function ($scope, $state, backendService, $ionicPopup) {
    backendService.fetchCurrentUser().then(function (res) {
      if (res['data']['user'].name == "default") {
        $state.go('app.login')
      } else {
        $scope.user = res['data']['visibleByRegisteredUsers'];
        $scope.user.username = res['data']['user'].name;
        $scope.user.email = res['data']['visibleByTheUser'].email;
      }
    });
    /*
     Function that is called after clicking edit button on MyAccount view
     changes state to edit account view
     */
    $scope.goToEdit = function () {
      $state.go('app.edit-account');
    };
    //delete account function
    $scope.deleteAccount = function (user) {
      var susUser = user.username;
      var confirmPopup = $ionicPopup.confirm({
        title: 'Delete Account',
        template: 'Are you sure you want to delete your account?'
      });
      confirmPopup.then(function (res) {
        if (res) {
          backendService.connect().then(function () {
            backendService.deleteAccount(susUser).then(function () {
              backendService.logout();
              var alertPopup = $ionicPopup.alert({
                title: 'Done!',
                template: 'Account deleted.'
              });
              alertPopup.then(function (re) {
                $state.go('app.main')
              });
            })
          });
          console.log('You are sure');
        } else {
          console.log('You are not sure');
        }
      });
    }
  })

  /*
   Controller for editing user information
   First gets user current personal information stored on backend
   After clicking submit button in edit-account view calls update account function with user form as a parameter
   Then redirects to MyAccount view
   */
  .controller('EditAccountCtrl', function ($scope, $state, backendService, $ionicPopup) {
    backendService.fetchCurrentUser().then(function (res) {
      $scope.user = res['data']['visibleByRegisteredUsers'];
      $scope.user.username = res['data']['user'].name;
      $scope.user.email = res['data']['visibleByTheUser'].email;
    });
    $scope.updateAccount = function (user) {
      backendService.updateUserProfile({"visibleByTheUser": {"email": user.email}});
      backendService.updateUserProfile({"visibleByRegisteredUsers": {"name": user.name, "gName": user.gName}});
      var alertPopup = $ionicPopup.alert({
        title: 'Done!',
        template: 'Account updated.'
      });
      alertPopup.then(function (re) {
        $state.go('app.my-account')
      });
    }
  });
