sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/model/json/JSONModel"
], function (Controller, History, Filter, FilterOperator, JSONModel) {
	"use strict";

	return Controller.extend("com.epiuse.zhrorderamend.controller.BaseController", {
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},

		// Set the attachment model
		_setAttachmentModel: function () {
			if (this.uuid) {
				this.getOwnerComponent().getModel().read("/AttachmentSet", {
					filters: [new Filter("Refguid", FilterOperator.EQ, this.uuid)],
					success: function (oData) {
						var json = new JSONModel([]);
						json.items = [];						

						for (var i = 0; i < oData.results.length; i++) {
							var item = {
								Guid: oData.results[i].Guid,
								fileName: oData.results[i].Filename,
								meddiaType: oData.results[i].Mimetype,
								url: "/sap/opu/odata/sap/ZHR_FIORI_FORMS_SRV/AttachmentSet('" + oData.results[i].Guid + "')/$value",
								uploadState: "Complete",
								CreatedBy: oData.results[i].CreatedBy,
								Erdat: oData.results[i].Erdat,
								selected: false
							};
							json.items.push(item);
						}
						this.getView().getModel("oModelAttach").setData(json);
					}.bind(this),
					error: function (oError) {
						sap.m.MessageToast.show("Error occured reading data");
					}
				});
			}
		},

		_getUserName: function () {
			var oUserInfoService = sap.ushell.Container.getService("UserInfo");
			return oUserInfoService.getFullName();
		},

		_createInitials: function (sName) {
			// Split the name into words
			const aWords = sName.split(' ');

			// Initialize an empty string to store the initials
			let sInitials = '';

			// Loop through each word
			for (let i = 0; i < aWords.length; i++) {
				// Get the first character of each word and convert it to uppercase
				sInitials += aWords[i].charAt(0).toUpperCase();
			}

			// Return the initials
			return sInitials;
		},

		_setFormModel: function (oRequest) {
			let oJsonReq,
				aAcknowledgements;

			// If there is a json payload parse it
			if (oRequest.Payload) {
				oJsonReq = JSON.parse(oRequest.Payload);
			}

			if (oRequest.Acknowledgements) {
				aAcknowledgements = JSON.parse(oRequest.Acknowledgements);
				oJsonReq.acknowledgements = aAcknowledgements;
			}

			// Initialise new note as blank
			oJsonReq.newNote = "";

			// Set the payload details
			const oMotGenReq = new JSONModel(oJsonReq);
			this.getOwnerComponent().setModel(oMotGenReq, "formDetails");
		},



		_formatCurrency: function (value) {
			if (!value || isNaN(value)) return "";
			
			const formatter = sap.ui.core.format.NumberFormat.getFloatInstance({
				minFractionDigits: 2,
				maxFractionDigits: 2,
				groupingEnabled: true,
				groupingSeparator: ' ',
				decimalSeparator: '.'
			});
			
			return 'R ' + formatter.format(parseFloat(value));
		},

		_formatToTwoDecimals: function (sValue) {
			if (!sValue || isNaN(sValue)) {
				return "";
			}
			return parseFloat(sValue).toFixed(2);
		},

		_formatPriceWithUnit: function (sPrice, sUnit) {
			if (!sPrice) return "";
			const sFormatted = this._formatCurrency(sPrice); 
			return sFormatted + " " + (sUnit || "");
		},

		_formatQuantityWithUnit: function (sQuantity, sUnit) {
			if (!sQuantity) return "";
			const sFormatted = this._formatToTwoDecimals(sQuantity); 
			return sFormatted + " " + (sUnit || "");
		},


		_formatDateToDDMMYYYY: function (vInput) {
			// If it's already in dd/mm/yyyy format, return as-is
			const ddMmYyyyRegex = /^\d{2}\/\d{2}\/\d{4}$/;
			if (typeof vInput === "string" && ddMmYyyyRegex.test(vInput)) {
				return vInput;
			}
		
			let oDate;
		
			if (vInput instanceof Date) {
				oDate = vInput;
			} else if (typeof vInput === "string") {
				oDate = new Date(vInput);
		
				// Try to parse dd/mm/yyyy manually if default Date parsing failed
				if (isNaN(oDate)) {
					const aParts = vInput.split("/");
					if (aParts.length === 3) {
						const [dd, mm, yyyy] = aParts;
						oDate = new Date(`${yyyy}-${mm}-${dd}`);
					}
				}
			}
		
			if (!(oDate instanceof Date) || isNaN(oDate)) {
				return "";
			}
		
			const sDay = String(oDate.getDate()).padStart(2, "0");
			const sMonth = String(oDate.getMonth() + 1).padStart(2, "0");
			const sYear = oDate.getFullYear();
		
			return `${sDay}/${sMonth}/${sYear}`;
		},
		
		




		check: function () {
			const oModel = this.getOwnerComponent().getModel();
			
			oModel.read("/AttachmentSet", {
				urlParameter: {
					"$top": 1
				},
				success: (oData) => {
					console.log("attachment data: ", oData);
					
				}
			})
		},
	});
});