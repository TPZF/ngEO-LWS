/**
 *  utilities file containing shared funccion
 */

module.exports = {

	/**
 	* Helper function to remove comments from the JSON file
 	*/
	removeComments: function(string) {
		var starCommentRe = new RegExp("/\\\*(.|[\r\n])*?\\\*/", "g");
		var slashCommentRe = new RegExp("(^[\/]|[^:]\/)\/.*[\r|\n]", "g");
		string = string.replace(slashCommentRe, "");
		string = string.replace(starCommentRe, "");
		return string;
	}
};