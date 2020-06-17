import moment from 'moment';

export class FormatDateValueConverter {
	toView(value, format) {
		var result = null;

		try {
			var m = moment(value);

			if(m.isValid()) {
				result = m.format(format);
			}
			else {
				result = null;
			}
		}
		catch(ex) {
			console.log("Exception caught in toView DateFormatValueConvert: " + ex);
			result = null;
		}

		return result;
	}

	fromView(value, format) {
		var result = null;

		try {
			var m = moment(value);
			if(m.isValid()) {
				result = m.format();
			}
			else {
				result = null;
			}
		}
		catch(ex) {
			console.log("Exception caught in fromView DateFormatValueConvert: " + ex);
			result = null;
		}

		return result;
	}
}
  
