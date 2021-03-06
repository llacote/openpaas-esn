'use strict';

angular.module('linagora.esn.contact')

  .controller('newContactController', function($rootScope, $scope, $route, $location, contactsService, notificationFactory, sendContactToBackend, displayContactError, closeContactForm, gracePeriodService, openContactForm, sharedContactDataService, $q) {
    $scope.bookId = $route.current.params.bookId;
    $scope.contact = sharedContactDataService.contact;

    $scope.close = closeContactForm;
    $scope.accept = function() {
      return sendContactToBackend($scope, function() {
        return contactsService.create($scope.bookId, $scope.contact).then(null, function(err) {
          notificationFactory.weakError('Contact creation', err && err.message || 'The contact cannot be created, please retry later');

          return $q.reject(err);
        });
      }).then(function() {
        $location.url('/contact/show/' + $scope.bookId + '/' + $scope.contact.id);
      }, function(err) {
        displayContactError(err);

        return $q.reject(err);
      }).then(function() {
        return gracePeriodService.clientGrace('You have just created a new contact (' + $scope.contact.displayName + ').', 'Cancel and back to edition')
            .then(function(data) {
              if (data.cancelled) {
                  contactsService.remove($scope.bookId, $scope.contact).then(function() {
                    data.success();
                    openContactForm($scope.bookId, $scope.contact);
                  }, function(err) {
                    data.error('Cannot cancel contact creation, the contact is created');
                    return $q.reject(err);
                });
              }
            });
      });
    };

    sharedContactDataService.contact = {};
  })
  .controller('showContactController', function($log, $scope, sharedContactDataService, $rootScope, ContactsHelper, CONTACT_DEFAULT_AVATAR, $timeout, $route, contactsService, notificationFactory, sendContactToBackend, displayContactError, closeContactForm) {
    $scope.defaultAvatar = CONTACT_DEFAULT_AVATAR;
    $scope.bookId = $route.current.params.bookId;
    $scope.cardId = $route.current.params.cardId;
    $scope.contact = {};
    $scope.loaded = false;

    $scope.close = closeContactForm;

    $scope.deleteContact = function() {
      closeContactForm();
      $timeout(function() {
        contactsService.deleteContact($scope.bookId, $scope.contact);
      }, 200);
    };

    contactsService.getCard($scope.bookId, $scope.cardId).then(function(card) {
      $scope.contact = card;
      $scope.formattedBirthday = ContactsHelper.getFormattedBirthday($scope.contact.birthday);
    }, function(err) {
      $log.debug('Error while loading contact', err);
      $scope.error = true;
      displayContactError('Cannot get contact details');
    }).finally (function() {
      $scope.loaded = true;
    });

    sharedContactDataService.contact = {};
  })
  .controller('editContactController', function($scope, $q, displayContactError, closeContactForm, $rootScope, $timeout, $location, notificationFactory, sendContactToBackend, $route, gracePeriodService, contactsService, CONTACT_DEFAULT_AVATAR, GRACE_DELAY) {
    $scope.loaded = false;
    $scope.bookId = $route.current.params.bookId;
    $scope.cardId = $route.current.params.cardId;

    contactsService.getCard($scope.bookId, $scope.cardId).then(function(card) {
      $scope.contact = card;
      $scope.defaultAvatar = CONTACT_DEFAULT_AVATAR;
    }, function() {
      $scope.error = true;
      displayContactError('Cannot get contact details');
    }).finally (function() {
      $scope.loaded = true;
    });

    $scope.close = function() {
      $location.path('/contact/show/' + $scope.bookId + '/' + $scope.cardId);
    };

    $scope.save = function() {
      return sendContactToBackend($scope, function() {
        return contactsService.modify($scope.bookId, $scope.contact).then(function(contact) {
          $scope.contact = contact;
          return contact;
        }, function(err) {
        });
      }).then(function() {
        $location.path('/contact/show/' + $scope.bookId + '/' + $scope.cardId);
      }, function(err) {
        displayContactError(err);
        return $q.reject(err);
      });
    };

    $scope.deleteContact = function() {
      closeContactForm();
      $timeout(function() {
        contactsService.deleteContact($scope.bookId, $scope.contact);
      }, 200);
    };

  })
  .controller('contactsListController', function($log, $scope, $q, usSpinnerService, $location, contactsService, AlphaCategoryService, ALPHA_ITEMS, user, displayContactError, openContactForm, ContactsHelper, gracePeriodService, $window, searchResultSizeFormatter, CONTACT_EVENTS, SCROLL_EVENTS, CONTACT_LIST_DISPLAY) {
    var requiredKey = 'displayName';
    var SPINNER = 'contactListSpinner';
    $scope.user = user;
    $scope.bookId = $scope.user._id;
    $scope.keys = ALPHA_ITEMS;
    $scope.sortBy = requiredKey;
    $scope.prefix = 'contact-index';
    $scope.searchResult = {};
    $scope.categories = new AlphaCategoryService({keys: $scope.keys, sortBy: $scope.sortBy, keepAll: true, keepAllKey: '#'});
    $scope.lastPage = false;
    $scope.searchFailure = false;
    $scope.totalHits = 0;
    $scope.displayAs = CONTACT_LIST_DISPLAY.list;
    $scope.currentPage = 0;

    function fillRequiredContactInformation(contact) {
      if (!contact[requiredKey]) {
        var fn = ContactsHelper.getFormattedName(contact);
        if (!fn) {
          fn = contact.id;
        }
        contact[requiredKey] = fn;
      }
      return contact;
    }

    function addItemsToCategories(data) {
      return $scope.$applyAsync(function() {
        data = data.map(fillRequiredContactInformation);
        $scope.categories.addItems(data);
        $scope.sorted_contacts = $scope.categories.get();
      });
    }

    function cleanCategories() {
      $scope.categories.init();
      delete $scope.sorted_contacts;
    }

    function setSearchResults(data) {
      $scope.searchResult.data = data.hits_list;
      $scope.searchResult.count = data.total_hits || 0;
      $scope.searchResult.formattedResultsCount = searchResultSizeFormatter($scope.searchResult.count);
    }

    function cleanSearchResults() {
      $scope.searchResult = {};
      $scope.totalHits = 0;
    }

    $scope.openContactCreation = function() {
      openContactForm($scope.bookId);
    };

    $scope.$on(CONTACT_EVENTS.CREATED, function(e, data) {
      if ($scope.searchInput) { return; }
      addItemsToCategories([data]);
    });

    $scope.$on(CONTACT_EVENTS.UPDATED, function(e, data) {
      if ($scope.searchInput) { return; }
      $scope.categories.replaceItem(fillRequiredContactInformation(data));
    });

    $scope.$on(CONTACT_EVENTS.DELETED, function(e, contact) {
      if ($scope.searchInput) { return; }
      $scope.categories.removeItemWithId(contact.id);
    });

    $scope.$on(CONTACT_EVENTS.CANCEL_DELETE, function(e, data) {
      addItemsToCategories([data]);
    });

    $scope.$on('ngRepeatFinished', function() {
      if (!$scope.searchInput) {$scope.$emit('viewRenderFinished');}
    });

    $scope.$on('$destroy', function() {
      gracePeriodService.flushAllTasks();
    });

    $scope.$on('$routeUpdate', function() {
        if (!$location.search().q) {
          if (!$scope.searchInput) {return;}
          $scope.searchInput = null;
          return $scope.search();
        }
        if ($location.search().q.replace(/\+/g, ' ') !== $scope.searchInput) {
          $scope.searchInput = $location.search().q.replace(/\+/g, ' ');
          return $scope.search();
        }
    });

    $window.addEventListener('beforeunload', gracePeriodService.flushAllTasks);

    $scope.appendQueryToURL = function() {
      if ($scope.searchInput) {
        $location.search('q', $scope.searchInput.replace(/ /g, '+'));
        return;
      }
      $location.search('q', null);
    };

    function searchFailure(err) {
      $log.error('Can not search contacts', err);
      displayContactError('Can not search contacts');
      $scope.searchFailure = true;
    }

    function loadPageComplete(spin) {
      return function() {
        $scope.loadingNextContacts = false;
        if (spin) {
          usSpinnerService.stop(SPINNER);
        }
      };
    }

    $scope.search = function() {
      $scope.$emit(SCROLL_EVENTS.RESET_SCROLL);
      cleanSearchResults();
      if (!$scope.searchInput) {
        cleanCategories();
        $scope.currentPage = 0;
        $scope.nextPage = 0;
        return $scope.loadContacts();
      }
      $scope.currentPage = 1;
      $scope.searchFailure = false;
      $scope.loadingNextContacts = true;
      $scope.lastPage = false;
      contactsService.search($scope.bookId, $scope.user._id, $scope.searchInput).then(function(data) {
        cleanCategories();
        setSearchResults(data);
        addItemsToCategories(data.hits_list);
        $scope.currentPage = data.current_page;
        $scope.totalHits = $scope.totalHits + data.hits_list.length;
        if ($scope.totalHits === data.total_hits) {
          $scope.lastPage = true;
        }
      }, searchFailure
      ).finally (loadPageComplete(false));
    };

    function getNextResults(spin) {
      if (spin) {
        usSpinnerService.spin(SPINNER);
      }

      contactsService.search($scope.bookId, $scope.user._id, $scope.searchInput, $scope.current_page).then(function(data) {
        $scope.currentPage = data.current_page;
        addItemsToCategories(data.hits_list);
        $scope.totalHits = $scope.totalHits + data.hits_list.length;
        if ($scope.totalHits === data.total_hits) {
          $scope.lastPage = true;
        }
      }, searchFailure
      ).finally (loadPageComplete(spin));
    }

    function getNextContacts(spin) {
      $log.debug('Load next contacts, page', $scope.currentPage);
      if (spin) {
        usSpinnerService.spin(SPINNER);
      }

      contactsService.list($scope.bookId, $scope.user._id, {page: $scope.nextPage || $scope.currentPage, cache: true, paginate: true}).then(function(data) {
        addItemsToCategories(data.contacts);
        $scope.lastPage = data.last_page;
        $scope.nextPage = data.next_page;
      }, function(err) {
        $log.error('Can not get contacts', err);
        displayContactError('Can not get contacts');
      }).finally (loadPageComplete(spin));
    }

    function updateScrollState() {
      if ($scope.loadingNextContacts) {
        return $q.reject();
      }
      $scope.loadFailure = false;
      $scope.loadingNextContacts = true;
      $scope.currentPage = $scope.nextPage || $scope.currentPage + 1;
      return $q.when();
    }

    function ongoingScroll() {
      $log.debug('Scroll search is already ongoing');
    }

    function scrollSearchHandler() {
      updateScrollState().then(function() {
        getNextResults(true);
      }, ongoingScroll);
    }

    function scrollContactsHandler() {
      updateScrollState().then(function() {
        getNextContacts(true);
      }, ongoingScroll);
    }

    $scope.loadContacts = function() {
      updateScrollState().then(function() {
        getNextContacts(false);
      }, ongoingScroll);
    };

    $scope.scrollHandler = function() {
      $log.debug('Infinite Scroll down handler');
      if ($scope.searchInput) {
        return scrollSearchHandler();
      }
      scrollContactsHandler();
    };

    if ($location.search().q) {
      $scope.searchInput = $location.search().q.replace(/\+/g, ' ');
      $scope.search();
    } else {
      $scope.searchInput = null;
      $scope.loadContacts();
    }

  })
  .controller('contactAvatarModalController', function($scope, selectionService) {
    $scope.imageSelected = function() {
      return !!selectionService.getImage();
    };

    $scope.saveContactAvatar = function() {
      if (selectionService.getImage()) {
        $scope.loading = true;
        selectionService.getBlob('image/png', function(blob) {
          var reader = new FileReader();
          reader.onloadend = function() {
            $scope.contact.photo = reader.result;
            selectionService.clear();
            $scope.loading = false;
            $scope.modal.hide();
            $scope.$apply();
            $scope.modify();
          };
          reader.readAsDataURL(blob);
        });
      }
    };
  })

  .controller('contactItemController', function($scope, $rootScope, $location, contactsService, notificationFactory, gracePeriodService, CONTACT_EVENTS, GRACE_DELAY) {

    function getFirstValue(property) {
      if (!$scope.contact[property] || !$scope.contact[property][0]) {
        return;
      }
      return $scope.contact[property][0].value;
    }

    function getFirstElement(property) {
      if ($scope.contact[property] && $scope.contact[property][0]) {
        return $scope.contact[property][0];
      }
    }

    function getElement(property) {
      return $scope.contact[property];
    }

    $scope.email = getFirstValue('emails');
    $scope.tel = getFirstValue('tel');
    $scope.org = getFirstElement('org');
    $scope.role = getElement('orgRole');

    $scope.displayContact = function() {
      $location.path('/contact/show/' + $scope.bookId + '/' + $scope.contact.id);
    };

    $scope.deleteContact = function() {
      contactsService.deleteContact($scope.bookId, $scope.contact);
    };
  });
