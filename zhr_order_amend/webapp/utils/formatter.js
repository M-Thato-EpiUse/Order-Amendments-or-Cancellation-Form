sap.ui.define([], function () {
	"use strict";

	return {
		// Format form title
		formatFormTitle: function (sProcess, sWi) {

			var sProcessTxt,
				sWiFormatted;

			// Get the process text
			switch (sProcess) {
			case "CREDAP":
				sProcessTxt = "Credit Application";
				break;
			default:
				sProcessTxt = "Process";
				break;
			}

			// Remove leading zeroes from the wi
			sWiFormatted = parseFloat(sWi).toString();

			// Format the title
			return sProcessTxt + " (" + sWiFormatted + ")";
		},
		
		// Format Work item to remove leading zeroes
		formatWi: function (sWi) {
			return parseFloat(sWi).toString();
		},

		// Format the status state
		formatStatusState: function (sStatus) {
			switch (sStatus) {
			case "READY":
				return "None";
			case "APPROVED":
				return "Success";
				break;
			case "REJECTED":
				return "Error";
				break;
			case "ATTENTION":
				return "Warning";
				break;
			case "ACKNWLDGE":
				return "Warning";
				break;
			case "ACKNWLDGED":
				return "Success";
				break;
			case "PART_ACK":
				return "Information";
				break;
			}
		},

		// Format a combination of date and time
		formatLongDate: function (dDate, tTime) {
			
			if (dDate && tTime) {
				// Format date
				var year = dDate.getFullYear(); // Get the 4-digit year
				var month = String(dDate.getMonth() + 1).padStart(2, '0'); // Get the month (0-11) and pad it with a leading zero if necessary
				var day = String(dDate.getDate()).padStart(2, '0'); // Get the day of the month and pad it with a leading zero if necessary
	
				var formattedDate = `${year}-${month}-${day}`; // Concatenate the year, month, and day with hyphens
	
				// Format time
				const time = new Date(tTime.ms); // Create a new Date object with the current date and time
	
				const hours = String(time.getHours()).padStart(2, '0'); // Get the hours and pad it with a leading zero if necessary
				const minutes = String(time.getMinutes()).padStart(2, '0'); // Get the minutes and pad it with a leading zero if necessary
				const seconds = String(time.getSeconds()).padStart(2, '0'); // Get the seconds and pad it with a leading zero if necessary
	
				const formattedTime = `${hours}:${minutes}:${seconds}`; // Concatenate the hours, minutes, and seconds with colons
	
				return formattedDate + " " + formattedTime;
			}
		},
		
		// Format date
		formatDate: function (dDate) {
			
			if (dDate) {
				// Format date
				var year = dDate.getFullYear(); // Get the 4-digit year
				var month = String(dDate.getMonth() + 1).padStart(2, '0'); // Get the month (0-11) and pad it with a leading zero if necessary
				var day = String(dDate.getDate()).padStart(2, '0'); // Get the day of the month and pad it with a leading zero if necessary
	
				var formattedDate = `${year}-${month}-${day}`; // Concatenate the year, month, and day with hyphens
				
				return formattedDate;
			}
		},
		
		// Format the status
		formatStatus: function (sStatus) {
			switch (sStatus) {
			case "READY":
				return "Pending Approval";
			case "APPROVED":
				return "Complete";
				break;
			case "COMPLETED":
				return "Complete";
				break;
			case "REJECTED":
				return "Rejected";
				break;
			case "ATTENTION":
				return "Requires Attention";
				break;
			case "ACKNWLDGE":
				return "Requires Acknowledgement";
				break;
			case "ACKNWLDGED":
				return "Acknowledged";
				break;
			case "PART_ACK":
				return "Acknowledged (Partial Pending)";
				break;
			}
		},
		
		// Format the icon of the workflow history
		formatStatusColour: function (sStatus) {
			switch (sStatus) {
				case "READY":
					return "Information"
					break;
				case "COMPLETED":
					return "Success";
					break;
			}
		},
		
		// Determine the duration in days since input date
		formatDurationSince: function (dDate) {
			
			if (dDate) {
				var dToday = new Date(),
				dFormatedDate = new Date(dDate),
				iDiffInTime = dToday.getTime() - dFormatedDate.getTime();
				
				var iDiffInDays = iDiffInTime / (1000 * 3600 * 24);
				
				return Math.floor(iDiffInDays) + " days ago";
			} else {
				return "0 days ago";
			}
		},
		
		formatCheckbox: function (sSelected) {
			return (sSelected === "X") ? true : false;
		},
		
		formatDateTime: function (sDateString) {
		  // Create a Date object from the ISO string
		  const date = new Date(sDateString);
		
		  // Define options for formatting
		  const options = {
		    year: 'numeric',
		    month: 'long',
		    day: 'numeric',
		    hour: '2-digit',
		    minute: '2-digit',
		    second: '2-digit',
		    timeZoneName: 'short'
		  };
		
		  // Format the date to a more reader-friendly string
		  const formattedDate = date.toLocaleString('en-US', options);
		
		  return formattedDate;
		}
	};
});