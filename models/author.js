const { DateTime } = require("luxon");

var mongoose = require('mongoose');

var Schema = mongoose.Schema;

var AuthorSchema = new Schema(
	{
		first_name: {type: String, required: true, maxLength: 100},
		family_name: {type: String, required: true, maxLength: 100},
		date_of_birth: {type: Date},
		date_of_death: {type: Date},
	}
);

AuthorSchema
	.virtual('name')
	.get(function () {
		return this.family_name + ', ' + this.first_name;
	});

AuthorSchema
	.virtual('lifespan')
	.get(function () {
		return (this.date_of_death.getYear() - this.date_of_birth.getYear()).toString();
	});

// Point to specific instance of the author
// We use virtuals because there's a uniform mapping for all authors
AuthorSchema
	.virtual('url')
	.get(function () {
		return '/catalog/author/' + this._id;
	});

AuthorSchema
	.virtual('birthDate')
	.get(function (){
		return this.date_of_birth ?
			DateTime.fromJSDate(this.date_of_birth).toLocaleString(DateTime.DATE_MED) :
			'';
	});

AuthorSchema
	.virtual('deathDate')
	.get(function (){
		return this.date_of_death ?
			DateTime.fromJSDate(this.date_of_death).toLocaleString(DateTime.DATE_MED) :
			'';
	});

module.exports = mongoose.model('Author', AuthorSchema);
