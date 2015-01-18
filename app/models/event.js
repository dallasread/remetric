import DS from 'ember-data';

export default DS.Model.extend({
  story: DS.attr('string'),
	info: DS.attr(),
	createdAt: DS.attr('timestamp'),
	person: DS.belongsTo('person', { async: true })
});
