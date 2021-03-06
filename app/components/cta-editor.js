import Ember from 'ember';

export default Ember.Component.extend({
	store: null,
	selectedTab: 0,
	currentCTA: Ember.computed.alias('session.cta'),
	sparkDelays: [
		{ value: 0, label: "Immediately" },
		{ value: 1000, label: "1 Second" },
		{ value: 2000, label: "2 Seconds" },
		{ value: 3000, label: "3 Seconds" },
		{ value: 5000, label: "5 Seconds" },
		{ value: 10000, label: "10 Seconds" },
		{ value: 20000, label: "20 Seconds" },
		{ value: 30000, label: "30 Seconds" },
		{ value: 45000, label: "45 Seconds" },
		{ value: 60000, label: "1 Minute" }
	],
	sparkEvents: [
		{ value: 'load', label: "On page load" },
		// { value: 'leave', label: "Predicted page leave" },
		// { value: 'scroll', label: "On scroll" },
		{ value: 'none', label: "None (show manually)" }
	],
	sparkRecurrances: [
		{ value: -1, label: "Always" },
		{ value: 9999, label: "Until they interact" },
		{ value: 1, label: "Once a day, until they interact" },
		{ value: 7, label: "Once a week, until they interact" },
		{ value: 30, label: "Once a month, until they interact" }
	],
	fieldTypes: [
		{ value: 'text', label: "Text" },
		{ value: 'email', label: "Email Address" },
		{ value: 'tel', label: "Telephone" }
	],
	placements: function() {
    switch (this.get('currentCTA.type')) {
      case 'topbar':
				return [
					{ value: 'top:bar', label: "Top of Page" },
					{ value: 'bottom:bar', label: "Bottom of Page" }
				];
      case 'social':
				return [
					{ value: 'mid-left:box', label: "Left of Page" },
					{ value: 'mid-right:box', label: "Right of Page" }
				];
      case 'lead':
				return [
					{ value: 'bottom-left:box', label: "Bottom Left of Page" },
					{ value: 'bottom-right:box', label: "Bottom Right of Page" }
				];
      case 'chat':
				return [
					{ value: 'bottom-left:box', label: "Bottom Left Box" },
					{ value: 'bottom-right:box', label: "Bottom Right Box" }
				];
		}
	}.property('currentCTA.type'),
	isSparkDelayed: function() {
		return this.get('currentCTA.spark.event') === 'load';
	}.property('currentCTA.spark.event'),
	isSparkScrollable: function() {
		return this.get('currentCTA.spark.event') === 'scroll';
	}.property('currentCTA.spark.event'),
	type: function() {
		return this.get('prettyName').toLowerCase().replace(/\s|\bwidget\b|\bform\b|\bbox\b/g, '');
	}.property('prettyName'),
	ctas: Ember.computed.filter('session.ctas', function(cta) {
		return cta.get('type') === this.get('type');
	}).property('session.ctas', 'type'),
	hasGiveAwayApp: function() {
		return this.get('session.organization.apps').findBy('id', 'giveaways');
	}.property('session.organization.apps'),
	sortSocialBy: ['ordinal'],
	sortedSocialNetworks: Ember.computed.sort('socialNetworks', 'sortSocialBy'),
	socialNetworks: function() {
		return this.get('store').findAll('social');
	}.property('store'),
	didInsertElement: function() {
		this.set('currentCTA', null);
	},
	actions: {
		editCTA: function(cta) {
			if (this.get('currentCTA')) {
				this.get('currentCTA').rollback();
			}

			this.set('selectedTab', 0);
			this.set('currentCTA', cta);
		},
		newCTA: function() {
			var e = this;
			var placement = { style: 'bar', location: 'top' };
			
			switch (this.get('type')) {
				case 'topbar':
					placement = { style: 'bar', location: 'top' };
					break;
				case 'lead':
					placement = { style: 'box', location: 'bottom-right' };
					break;
				case 'social':
					placement = { style: 'box', location: 'mid-left' };
					break;
				case 'chat':
					placement = { style: 'box', location: 'bottom-right' };
					break;
			}
			
			var cta = this.get('store').createRecord('cta', {
				name: this.get('prettyName') + ' #' + (this.get('ctas.length') + 1),
				type: this.get('type'),
				isActive: false,
				placement: placement
			});
			
			if (this.get('type') === 'social') {
				cta.set('social', {
					facebook: true,
					twitter: true
				});
			} else {
				var name = this.get('store').createRecord('field', {
					label: 'What is your name?',
					permalink: 'name',
					type: 'text',
					isRequired: true,
					isForProfile: true,
					ordinal: 0
				});
			
				var email = this.get('store').createRecord('field', {
					label: 'What is your email?',
					permalink: 'email',
					type: 'email',
					isRequired: true,
					isForProfile: true,
					ordinal: 1
				});
				
				cta.get('fields').addObject(name);
				cta.get('fields').addObject(email);
			}
			
			cta.save().then(function() {
				e.set('currentCTA', cta);
			});
		},
		saveCTA: function() {
			this.get('currentCTA').save();
		},
		activateCTA: function() {
			this.toggleProperty('currentCTA.isActive');
			this.get('currentCTA').save();
		},
		deleteCTA: function() {
			if (confirm("Are you sure you want to delete this " + this.get('prettyName') + "?")) {
				var e = this;
				this.get('currentCTA').destroyRecord().then(function() {
					e.set('currentCTA', null);
				});
			}
		},
		duplicateCTA: function() {
			if (confirm("Fields, notifications, and social won't be duplicated. Are you sure you want to duplicate?")) {
				var e = this;
				var attrs = this.get('currentCTA').toJSON();
				attrs.name = attrs.name + ' (Duplicate)';
			
				this.get('currentCTA').eachRelationship(function(name, relationship) {
					if (relationship.kind === 'hasMany') {
						delete attrs[relationship.key];
					}
				});
			
				var dup = this.get('store').createRecord('cta', attrs);
			
				dup.save().then(function(cta) {
					e.set('currentCTA', cta);
				});
			}
		},
		resetCTA: function() {
			this.get('currentCTA').rollback();
		},
		addField: function() {
			var field = this.get('store').createRecord('field', {});
			this.get('currentCTA.fields').addObject(field);
		},
		deleteField: function(field) {
			this.get('currentCTA.fields').removeObject(field);
		},
		addNotification: function() {
			var notification = this.get('store').createRecord('notification', {
				to: this.get('session.user.name') + " <" + this.get('session.user.email') + ">",
				subject: this.get('session.organization.name') + ' Response',
				message: "{{person.name}} ({{person.email}}) has submitted a form:\n\n{{data}}\n\nThanks,\n\n" + this.get('session.organization.name')
			});
			this.get('currentCTA.notifications').addObject(notification);
		},
		deleteNotification: function(notification) {
			this.get('currentCTA.notifications').removeObject(notification);
		},
	}
});
