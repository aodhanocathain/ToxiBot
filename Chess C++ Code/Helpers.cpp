#include <string>
using std::string;
#include <vector>
using std::vector;

#include "Helpers.h"

vector<string> Helpers::string_split(string base, char delimiter)
{
	vector<string> substrings;

	string::const_iterator substringStart = base.cbegin();
	for(string::const_iterator scanner = base.cbegin(); scanner!=base.cend(); scanner++)
	{
		if ((*scanner) == delimiter)
		{
			int start = std::distance(base.cbegin(), substringStart);
			int length = std::distance(substringStart, scanner);
			substrings.push_back(base.substr(start, length));
			substringStart = scanner+1;
		}
	}

	int start = std::distance(base.cbegin(), substringStart);
	int length = std::distance(substringStart, base.cend());
	substrings.push_back(base.substr(start, length));

	return substrings;
}