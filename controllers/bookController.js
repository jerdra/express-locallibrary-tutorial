const {body, validationResult} = require('express-validator');
var Book = require('../models/book');
var Author = require('../models/author');
var Genre = require('../models/genre');
var BookInstance = require('../models/bookinstance');

var async = require('async');

exports.index = function(req, res) {
	async.parallel({
		book_count: function(callback){
			//Empty object w/no match condition to get all documents
			Book.countDocuments({}, callback);
		},
		book_instance_count: function(callback){
			BookInstance.countDocuments({}, callback);
		},
		book_instance_available_count: function(callback){
			BookInstance.countDocuments({status: "Available"}, callback);
		},
		author_count: function(callback){
			Author.countDocuments({}, callback);
		},
		genre_count: function(callback){
			Genre.countDocuments({}, callback);
		},
	}, function(err, results) {
		res.render('index', { title: 'Local Library HOME', error: err, data: results});
	});
};

// Display list of all books.
exports.book_list = function(req, res) {
	Book.find({}, 'title author')
		.populate('author')
		.exec(function(err, list_books) {
			if (err) { return next(err); }
			res.render('book_list', { title: 'Book List', book_list: list_books });
		});
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
	async.parallel({
		book: function(callback) {
			Book.findById(req.params.id)
				.populate('author')
				.populate('genre')
				.exec(callback);
		},
		book_instance: function(callback){
			BookInstance.find({'book': req.params.id })
				.exec(callback);
		},
	}, function(err, results) {
		if (err) { return next(err); }
		if (results.book == null){
			var err = new Error('Book not found');
			err.status = 404;
			return next(err);
		}

		res.render('book_detail',
			{
				title: results.book.title,
				book: results.book,
				book_instance: results.book_instance
			}
		);
	});
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
	// This information is needed in order to display the list
	// of valid authors and genres
		async.parallel({
			authors: function(callback){
				Author.find(callback);
			},
			genres: function(callback){
				Genre.find(callback);
			},
		}, function(err, results) {
			if (err) { return next(err); }
			res.render('book_form',
				{
					title: 'Create Book',
					authors: results.authors,
					genres: results.genres
				}
			);
		});
};

// Handle book create on POST.
exports.book_create_post = [
	(req, res, next) => {
		if(!(req.body.genre instanceof Array)){
			if(typeof req.body.genre === "undefined"){
				req.body.genre = [];
			}
			else {
				req.body.genre = new Array(req.body.genre);
			}
		}
		next();
	},
	body('title', 'Title must not be empty.').trim()
	.isLength({min: 1}).escape(),
	body('author', 'Author must not be empty.').trim()
	.isLength({min: 1}).escape(),
	body('summary', 'Summary must not be empty.').trim()
	.isLength({min: 1}).escape(),
	body('isbn', 'ISBN must not be empty.').trim()
	.isLength({min: 1}).escape(),
	body('genre.*').escape(),

	(res, req, next) => {
		const errors = validationResult(req);

		var book = new Book(
			{
				title: req.body.title,
				author: req.body.author,
				summary: req.body.summary,
				isbn: req.body.isbn,
				genre: req.body.genre
			}
		);

		if (!errors.isEmpty()){
			async.parallel({
				authors: function(callback){
					Author.find(callback);
				},
				genres: function(callback){
					Genre.find(callback);
				},
			}, function(err, results){
				if (err) { return next(err); }

				for (let i = 0; i < results.genres.length; i++){
					if (book.genre.indexOf(results.genres[i]._id) > -1){
						results.genres[i].checked = 'true';
					}
				}
				res.render('book_form',
					{
						title: 'Create Book',
						authors: results.authors,
						genres: results.genres,
						book: book,
						errors: errors.array()
					}
				);
			});
			return;
		} else {
			book.save(function (err) {
				if (err) { return next(err); }
				res.redirect(book.url);
			});
		}
	}
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
	// In order to delete book you need book
	// instances
	async.parallel({
		//The GET contains the current Book ID to delete
		book: function(callback){
			Book.findById(req.params.id).exec(callback)
		},
		book_instances: function(callback){
			BookInstance.find({'book': req.params.id})
				.populate('book').exec(callback)
		},
	}, function (err, results){
		if (err) { return next(err); }

		// If no books are found then we return
		// to catalogs
		if (results.book==null){
			res.redirect('/catalog/books')
		}

		// Render form to delete books
		res.render('book_delete',
			{
				title: 'Delete Book',
				book: results.book,
				book_instances: results.book_instances
			}
		);
	});
};

// Handle book delete on POST.
// When form is submitted...
exports.book_delete_post = function(req, res, next) {
	async.parallel({
		book: function(callback){
			Book.findById(req.body.bookid).exec(callback)
		},
		book_instances: function(callback){
			BookInstance.find({'book': req.body.bookid}).exec(callback)
		}
	}, function(err, results){
		if (err) { return next(err); }

		// Sucess! First check if any book instances exist
		if (results.book_instances.length > 0){
			// If so render GET w/book_instances included
			res.render('book_delete',
				{
					title: 'Delete Book',
					book: results.book,
					book_instances: results.book_instances
				}
			);
			return;
		} else {
			// In this case we have no book_instances!
			Book.findByIdAndRemove(req.body.bookid, function deleteBook(err) {
				if (err) { return next(err); }
				res.redirect('/catalog/books');
			});
		}
	});
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
	async.parallel({
		book: function(callback){
			Book.findById(req.params.id).populate('author')
				.populate('genre')
				.exec(callback);
		},
		authors: function(callback){
			Author.find(callback);
		},
		genres: function(callback){
			Genre.find(callback);
		},
	}, function(err, results){
		if (err) { return next(err); }
		if (results.book==null){
			var err = new Error('Book not found');
			err.status = 404;
			return next(err);
		}

		for (var all_g_iter = 0; all_g_iter < results.genres.length; all_g_iter++){
			for (var book_g_iter = 0; book_g_iter < results.book.genre.length; book_g_iter++){
				if (results.genres[all_g_iter]._id.toString()===results.book.genre[book_g_iter]._id.toString()){
					results.genres[all_g_iter].checked='true';
				}
			}
		}
		res.render('book_form',
			{
				title: 'Update Book',
				authors: results.authors,
				genres: results.genres,
				book: results.book
			}
		);
	});
};

// Handle book update on POST.
exports.book_update_post = [
	(req, res, next) => {
		if(!(req.body.genre instanceof Array)){
			if(typeof req.body.genre==='undefined') { req.bpdy.genre=[]; }
			else { req.body.genre = new Array(req.body.genre); }
		}
		next();
	},
    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('author', 'Author must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('summary', 'Summary must not be empty.').trim().isLength({ min: 1 }).escape(),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }).escape(),
    body('genre.*').escape(),

	(req, res, next) => {
		const errors = validationResult(req);

		var book = new Book(
			{
				title: req.body.title,
				author: req.body.author,
				summary: req.body.summary,
				isbn: req.body.idbn,
				genre: (typeof req.body.genre==='undefined') ? [] : req.body.genre,
				_id: req.params.id //required or a new ID will be assigned
			}
		);

		if (!errors.isEmpty()){
			async.parallel({
				authors: function(callback){
					Author.find(callback);
				},
				genres: function(callback){
					Genre.find(callback);
				},
			}, function(err, results){
				if (err) {return next(err); }

				for (let i=0; i<results.genres.length; i++){
					results.genres[i].checked='true';
				}
				res.render('book_form',
					{
						title: 'Update Book',
						authors: results.authors,
						genres: results.genres,
						book: book,
						errors: errors.array()
					}
				);
			});
			return;
		} else {
			Book.findByIdAndUpdate(req.params.id, book, {}, function(err,thebook){
				if (err) {return next(err);}
				res.redirect(thebook.url);
			});
		}
	}
];
