import Ember from 'ember';

export default Ember.Route.extend({
	actions: {
		willTransition: function(transition) {
			this.routeFor('application').send('openModal', 'signin', false);
			transition.abort();
		}
	}
});