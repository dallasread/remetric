/* globals Firebase, _RMI, _RMO, externalLoader */

import Ember from 'ember';
import config from './../config/environment';

var setupTracking = function() {
	window._RMOID = Ember.$('[data-remetric]').data('remetric').replace(/[^a-z0-9]+/gi, '-').replace(/^-*|-*$/g, '');
	window._RMO = Ember.$.extend({}, _RMI);
	_RMO.api_key = window._RMOID;
	_RMO.domain = config.remetric.domain;
	_RMI.api_key = config.remetric.api_key;
	_RMI.domain = config.remetric.domain;

	_RMO.notify = function(event, cta_id, notification_id) {
        var base64, data, img;
        img = document.createElement("img");
        img.style.display = "none";
        event.page = {
          title: document.title,
          url: document.URL
        };
        data = {
          event: event,
          cta_id: cta_id,
          notification_id: notification_id
        };
        base64 = encodeURIComponent(btoa(JSON.stringify(data)));
        img.src = "" + this.domain + "/api/" + this.api_key + "/notify/" + base64;
        return document.body.appendChild(img);
      };
};

export default {
  name: 'session',
	after: 'store',
  initialize: function(container, app) {
		window._RMDB = new Firebase('https://remetric.firebaseio.com/');
		setupTracking();

		var loader = ['styles', 'user'];
		var loadComplete = function(loaded) {
			var index = loader.indexOf(loaded);
			loader.splice(index, 1);
			if (!loader.length) {
				app.advanceReadiness();
			}
		};

		var store = container.lookup('store:main');
		var router = container.lookup('router:main');
		var session = Ember.Object.create({
            organization_id: window._RMOID,
            afterSignIn: false,
            isStripeLoaded: false,
            person: null,
            user: null,
            config: config
		});

		externalLoader(config.stylesheetURL, function() {
			loadComplete( 'styles' );
		});

		app.register('session:main', session, { instantiate: false, singleton: true });
		app.inject('route', 'session', 'session:main');
		app.inject('controller', 'session', 'session:main');
		app.inject('component', 'session', 'session:main');
		app.inject('view', 'session', 'session:main');
		app.inject('model', 'session', 'session:main');

		var advanceReadiness = function() {
			if (session.get('afterSignIn')) {
				router.transitionTo( 'dashboard' );
				session.set('afterSignIn', false);
			}

			loadComplete( 'user' );
		};

		var findOrCreatePerson = function(uid) {
			if (typeof uid === 'undefined') { uid = 0; }
			session.set('person', null);
			session.set('user', null);

			if (session.get('organization')) {
  			store.find('person', uid).then(function(p) {
  				setPerson(p);
  			}, function() {
  				window._RMDB.authAnonymously(function(error, auth) {
  				  if (!error) {
        			store.createRecord('person', {
        				id: auth.uid,
        				isKnown: false,
        				createdAt: new Date(),
        				lastSeenAt: new Date()
        			}).save().then(function(person) {
								setPerson(person);
							});
  				  }
  				});
  			});
			} else {
				setPerson(true);
			}
		};

		var setPerson = function(person) {
			session.set('person', person);
			advanceReadiness();
		};

		var setOnAuth = function() {
			window._RMDB.onAuth(function(auth) {
				if (auth) {
          if (session.get('organization')) {
  					store.find('user', auth.uid).then(function(user) {
  						session.set('user', user);

  						store.find('person', auth.uid).then(function(person) {
  							setPerson(person);
  						}, function() {
  							store.unloadAll('person');

  							store.createRecord('person', {
  								id: auth.uid,
  								info: {
  									name: user.get('name'),
  									email: user.get('email')
  								},
  								isKnown: true,
  								createdAt: new Date(),
  								lastSeenAt: new Date()
  							}).save().then(function(person) {
  								setPerson(person);
  							});
  						});
  					}, function() {
  						if (session.get('afterSignIn')) {
  							alert("You are not permitted to log in.");
  							session.set('afterSignIn', false);
  							window._RMDB.unauth();
  							findOrCreatePerson();
  						} else {
  							findOrCreatePerson(auth.uid);
  						}
  					});
          } else {
					  findOrCreatePerson();
					}
				} else {
					findOrCreatePerson();
				}
			});
		};

		store.find('organization', window._RMOID).then(function(organization) {
			session.set('organization', organization);
			setOnAuth();
		}, function() {
			setOnAuth();
		});

		app.deferReadiness();
	}
};
