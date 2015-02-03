import DS from 'ember-data';

export default DS.Model.extend({
  name: DS.attr('string'),
	type: DS.attr('string'),
	createdAt: DS.attr('timestamp'),
	active: DS.attr('boolean')
});
