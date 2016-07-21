'use strict';

class InputError extends Error {
	constructor(message, code) {
		super(message);
		this.code = code;
	}
	
	toJSON() {
		return { message: this.message, code: this.code };
	}
}

const express = require('express');

function substituteX(template, values) {
	let valueIndex = 0;
	return template.replace(/x/g, function(match) {
		const finalValue = values[valueIndex];
		valueIndex += 1;
		return finalValue;
	});
}

const validators = {
	NIP: function(input) {
		const v = input.slice(0, 10);
		const checksum = v[0] * 6 + v[1] * 5 + v[2] * 7 + v[3] * 2 + v[4] * 3 + v[5] * 4 + v[6] * 5 + v[7] * 6 + v[8] * 7;
		return (checksum % 11) === Number(input[9]);
	}
};

const constraints = {
	maxPlaceholders: 3
};

const guessers = {
	NIP: function(input) {
		if (input.length !== 10) {
			throw new InputError('Invalid input length', 'INPUT_LENGTH');
		}
		function randomDigits(head, length, callback) {
			if (length === 0) {
				return void callback(head);
			}
			for (let i = 0; i <= 9; i += 1) {
				randomDigits(head + i, length - 1, callback);
			}
		}
		const possibilities = [];
		const placeholderCount = (input.match(/x/g) || []).length;
		if (placeholderCount > constraints.maxPlaceholders) {
			throw new InputError('Too many placeholders', 'MAX_PLACEHOLDERS');
		}
		randomDigits('', placeholderCount, function(placeholderValues) {
			const supposedNumber = substituteX(input, placeholderValues);
			if (validators.NIP(supposedNumber)) {
				possibilities.push(supposedNumber);
			}
		});
		return possibilities;
	}
};

const app = express();
app.set('view engine', 'pug');
app.set('views', __dirname + '/templates');

app.get('/api/validate/nip/:input', function(req, res) {
	try {
		const isValid = validators.NIP(req.params.input);
		res.send({
			isValid
		});
	}
	catch (error) {
		res.send({ code: error.code, message: error.message });
	}
});

app.get('/api/guess/nip/:input', function(req, res) {
	try {
		res.send({
			possibilities: guessers.NIP(req.params.input)
		});
	}
	catch (error) {
		res.send({ code: error.code, message: error.message });
	}
});

app.get('/', function(req, res) {
	res.render('index', {
		input: req.query.input || '',
		possibilities: (req.query.input ? guessers.NIP(req.query.input) : null)
	});
});

app.listen(process.env.HTTP_PORT || 3432, function() {
	console.log('started');
});
