const {body, validateRequest} = require('express-validator');

var Author = require('../models/author');
var Book = require('../models/book');
var async = require('async');

//Display full list of authors
exports.author_list = function(req, res, next) {
	Author.find()
		.sort([['family_name', 'ascending']])
		.exec(function (err, list_authors) {
			if (err) { return next(err); }
			res.render('author_list', {title: 'Author List', author_list: list_authors });
		});
};

// Display detail page for a specific author
exports.author_detail = function(req, res, next) {
	async.parallel({
		// Mongoose will execute callback after retrieving results
		author: function(callback) {
			Author.findById(req.params.id)
				.exec(callback)
		},
		author_books: function(callback){
			Book.find({ 'author': req.params.id }, 'title summary')
				.exec(callback)
		},
	}, function(err, results){
		if (err) { return next(err); }
		if (results.author==null) {
			var err = new Error('Author not found')
			err.status = 404;
			return next(err);
		}

		res.render('author_detail',
			{
				title: 'Author Detail',
				author: results.author,
				author_books: results.author_books
			}
		);
	});
};

// Display Author create form on GET.
exports.author_create_get = function(req, res, next) {
	res.render('author_form', {title: 'Create Author'});
};

exports.author_create_post = [
	body('first_name').trim()
	.isLength({min: 1}).escape().withMessage('First name must be specified')
	.isAlphanumeric().withMessage('First name has non-alphanumeric characters.'),
	body('family_name').trim()
	.isLength({min: 1}).escape().withMessage('Family name must be specified')
	.isAlphanumeric().withMessage('Family name has non-alphanumeric characters.'),
	body('date_of_birth', 'Invalid date of birth').optional({ checkFalsy: true})
	.isISO8601().toDate(),
	body('date_of_death', 'Invalid date of death').optional({ checkFalsy: true})
	.isISO8601().toDate(),
	(req, res, next) => {
		const errors = validationResult(req);

		if (!errors.isEmpty()){
			res.render('author_form',
				{
					title: 'Create Author',
					author: req.body,
					errors: errors.array()
				}
			);
		}
		else {
			var author = new Author(
				{
					first_name: req.body.first_name,
					family_name: req.body.family_name,
					date_of_death: req.body.date_of_death,
					date_of_birth: req.body.date_of_birth
				}
			);

			author.save(function(err){
				if (err) { return next(err); }
				res.redirect(author.url);
			});
		}
	}
];

// Display Author delete form on GET.
exports.author_delete_get = function(req, res, next) {
	async.parallel({
		author: function(callback){
			Author.findById(req.params.id).exec(callback)
		},
		author_books: function(callback){
			Book.find({'author':req.params.id}).exec(callback)
		},
	}, function(err, results){
		if (err) { return next(err); }
		if (results.author==null){
			res.redirect('/catalog/authors');
		}

		res.render('author_delete',
			{
				title: 'Delete Author',
				author: results.author,
				author_books: results.author_books
			}
		);
	});
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
	async.parallel({
		author: function(callback){
			Author.findById(req.params.id).exec(callback)
		},
		author_books: function(callback){
			Book.find({'author':req.params.id}).exec(callback)
		},
	}, function(err, results){
		if (err) {return next(err);}
		if (results.authors_books.length > 0){
			res.render('author_delete',
				{
					title: 'Delete Author',
					author: results.author,
					author_books: results.author.books
				}
			);
		} else {
			Author.findByIdAndRemove(req.body.authorid, function deleteAuthor(err){
				if (err) { return next(err) }
				res.redirect('/catalog/authors')
			});
		}
	});
};

// Display Author update form on GET.
exports.author_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Author update GET');
};

// Handle Author update on POST.
exports.author_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Author update POST');
};
