sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../utils/formatter",
	"sap/m/library",
	"sap/ui/core/Fragment",
	"sap/ui/core/format/DateFormat",
	'sap/m/MessageToast',
	"../lib/html2pdf"
], function (BaseController, JSONModel, formatter, mobileLibrary, Fragment, DateFormat, MessageToast, HTMLtoPDF) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("com.epiuse.zhrorderamend.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
			});

			this.oRouter = this.getOwnerComponent().getRouter();

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("wfobject").attachPatternMatched(this._onObjectMatchedWF, this);

			this.setModel(oViewModel, "detailView");

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		// Resubmit a rejected workflow
		onResubmit: function (oEvent) {

			// Get the payload of the form to be resubmitted
			var oFormReq = oEvent.getSource().getBindingContext().getObject(),
				oPayload;

			// Parse the string to object
			if (oFormReq.Payload) {
				oPayload = JSON.parse(oFormReq.Payload);
			}
			
			// Convert the date time format to usuable format
			if (oPayload.closingDateTime) {
				oPayload.closingDateTime = new Date(oPayload.closingDateTime);
			}
			
			if (oPayload.validityPeriodStart) {
				oPayload.validityPeriodStart = new Date(oPayload.validityPeriodStart);
			}
			
			if (oPayload.validityPeriodEnd) {
				oPayload.validityPeriodEnd = new Date(oPayload.validityPeriodEnd);
			}
			
			if (oPayload.fixFirmPeriodStart) {
				oPayload.fixFirmPeriodStart = new Date(oPayload.fixFirmPeriodStart);
			}
			
			if (oPayload.fixFirmPeriodEnd) {
				oPayload.fixFirmPeriodEnd = new Date(oPayload.fixFirmPeriodEnd);
			}

			// Set the payload details
			var oCredAppModel = new JSONModel(oPayload);
			this.getOwnerComponent().setModel(oCredAppModel, "formDetails");

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Navigate to create a new form
			this.oRouter.navTo("create", {
				type: "resub"
			});
		},

		// Edit a workflow that requires attention
		onEdit: function (oEvent) {

			// Get the payload of the form to be resubmitted
			var oFormReq = oEvent.getSource().getBindingContext().getObject(),
				oPayload,
				sWi = this.getView().getBindingContext().getObject().Wi;

			// Parse the string to object
			if (oFormReq.Payload) {
				oPayload = JSON.parse(oFormReq.Payload);
			}
			
			// Convert the date time format to usuable format
			if (oPayload.closingDateTime) {
				oPayload.closingDateTime = new Date(oPayload.closingDateTime);
			}
			
			if (oPayload.validityPeriodStart) {
				oPayload.validityPeriodStart = new Date(oPayload.validityPeriodStart);
			}
			
			if (oPayload.validityPeriodEnd) {
				oPayload.validityPeriodEnd = new Date(oPayload.validityPeriodEnd);
			}
			
			if (oPayload.fixFirmPeriodStart) {
				oPayload.fixFirmPeriodStart = new Date(oPayload.fixFirmPeriodStart);
			}
			
			if (oPayload.fixFirmPeriodEnd) {
				oPayload.fixFirmPeriodEnd = new Date(oPayload.fixFirmPeriodEnd);
			}

			// Set the payload details
			var oCredAppModel = new JSONModel(oPayload);
			this.getOwnerComponent().setModel(oCredAppModel, "formDetails");

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Navigate to create a new form
			this.oRouter.navTo("edit", {
				wi: sWi
			});
		},

		// Refresh the column size of the tree table
		onTreeTableLoad: function (oEvent) {
			oEvent.getSource().autoResizeColumn();
		},

		// Download the selected attachment
		onPressAttach: function (oEvent) {
			var oFile = oEvent.getSource().getBindingContext("oModelAttach").getObject(),
				sGuid = oFile.Guid,
				sPath = "/AttachmentFileSet('" + sGuid + "')",
				that = this;

			// Remove the attachment from the backend
			this.getOwnerComponent().getModel().read(sPath, {
				success: function (oData) {
					that.downloadBase64File(oData.EvMimetype, oData.EvContent, oData.EvFilename);
				},
				error: function (oData) {
					MessageToast.show("Error occured reading data");
				}
			});
		},

		// Save the new note
		onNewNoteSave: function (oEvent) {
			var that = this;

			// Check for edit or new request
			var sWi = this.sWi

			// Get the form details
			var oModel = this.getOwnerComponent().getModel("formDetails"),
				oFormReq = oModel.getData();

			// Convert note to nested array of objects
			var oNote = {
				Creator: this._getUserName(),
				Note: oFormReq.newNote,
				Initials: this._createInitials(this._getUserName()),
				CreateDate: new Date()
			}

			oFormReq.note.push(oNote);
			oFormReq.newNote = "";

			// Set back the updated model
			oModel.setData(oFormReq);

			// Refresh notes binding
			that.getView().byId("nlNotes").getBinding("items").refresh();

			// Convert the form request details to json
			var sPayload = JSON.stringify(oFormReq),
				dCreateTime = new Date();

			// Format the create time
			var oFormat = DateFormat.getDateInstance({
				pattern: "PThh'H'mm'M'ss'S'"
			});

			// Build the details of the request
			var oEntity = {
				Process: 'MOTGR',
				Wi: sWi,
				CreateDate: dCreateTime,
				CreateTime: oFormat.format(dCreateTime),
				Status: "READY",
				Initiator: "",
				Payload: sPayload,
				Refguid: that.uuid
			}

			// Send the request to create the new form
			this.getModel().create("/FormSet", oEntity, {
				success: function (oResponse) {
					// Display success message
					var sMsg = 'Note Saved';
					MessageToast.show(sMsg);
				},
				error: function (oResponse) {
					console.log(oResponse)
				}
			});
		},

		onPrintPDF: function (oEvent) {

			let that = this;

			// Set invisible components
			this.getView().byId("taNote").setVisible(false);
			this.getView().byId("btnSave").setVisible(false);

			// Expand status table
			this.getView().byId("tblWorkflowHistory").expandToLevel(2);

			// Expand header
			this.getView().byId("detailPage").setHeaderExpanded(true);

			sap.ui.getCore().applyChanges();

			setTimeout(function () {
				// Get form which needs to be printed
				var oElement = that.getView().getDomRef("-detailPage");

				// Get the current timestamp
				let sTimestamp = new Date().toISOString().replace(/[-:.]/g, '');
				let sWI = that.sWi;
				let sFilename = `gen_req_${sWI}_${sTimestamp}.pdf`;

				// Set config of pdf
				var oOptions = {
					margin: 0.5,
					filename: sFilename,
					image: {
						type: 'jpeg',
						quality: 1
					},
					html2canvas: {
						scale: 2
					},
					jsPDF: {
						unit: 'in',
						format: 'letter',
						orientation: 'portrait'
					},
					pagebreak: {
						mode: 'avoid-all'
					}
				};

				html2pdf().set(oOptions).from(oElement).save();

				// Set visible components
				that.getView().byId("taNote").setVisible(true);
				that.getView().byId("btnSave").setVisible(true);
			}, 2000);
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		// Download file
		downloadBase64File: function (contentType, base64Data, fileName) {
			var linkSource = `data:${contentType};base64,${base64Data}`;
			var downloadLink = document.createElement("a");
			downloadLink.href = linkSource;
			downloadLink.download = fileName;
			downloadLink.click();
		},

		// Logic to be applied when the detail page is loaded
		_onObjectMatched: function (oEvent) {

			// Get the Id for the form from the parameters
			var sObjectId = oEvent.getParameter("arguments").objectId;

			this.sWi = sObjectId;

			// Set the column layout
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			// Init the attachment model
			var oAttachments = new JSONModel([]);
			oAttachments.items = [];
			this.getOwnerComponent().setModel(oAttachments, "oModelAttach");

			// Once the metadata has loaded bind the view to the path of the selected form
			this.getModel().metadataLoaded().then(function () {

				// Create key to selected form request
				var sObjectPath = this.getModel().createKey("FormSet", {
					Wi: sObjectId
				});

				// Load the history
				this._loadHistory(sObjectPath);

				// Bind the path to the view
				this._bindView("/" + sObjectPath);

				// Load the fragment for the form
				this._displayFragment("Display");
			}.bind(this));
		},

		// Logic to be applied when the detail page is loaded from the inbox application
		_onObjectMatchedWF: function (oEvent) {
			// Set the column layout
			this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");

			// Init the attachment model
			var oAttachments = new JSONModel([]);
			oAttachments.items = [];
			this.getOwnerComponent().setModel(oAttachments, "oModelAttach");

			// Disable the the close button and full screen button
			this.getView().byId("closeColumn").setVisible(false);
			this.getView().byId("enterFullScreen").setVisible(false);

			// Get the Id for the form from the parameters
			var sObjectId = oEvent.getParameter("arguments").wfInstanceId;

			this.sWi = sObjectId;

			// Once the metadata has loaded bind the view to the path of the selected form
			this.getModel().metadataLoaded().then(function () {

				// Create key to selected form request
				var sObjectPath = this.getModel().createKey("FormSet", {
					Wi: sObjectId
				});

				// Bind the path to the view
				this._bindViewWf("/" + sObjectPath);

				// Load the fragment for the form
				this._displayFragment("Display");
			}.bind(this));
		},

		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView"),
				that = this;
				
			// Set source - Standalone application
			this.iSource = 0;

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_bindViewWf: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("detailView"),
				that = this;
				
			// Set source - Standalone application
			this.iSource = 1;

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						var oRequest = that.getView().getBindingContext().getObject(),
							oJsonReq;

						// If there is a json payload parse it
						if (oRequest.Payload) {
							oJsonReq = JSON.parse(oRequest.Payload);
						};

						// Set visibility of history
						oJsonReq.viewHistory = false;

						// Set the payload details
						var oCredAppModel = new JSONModel(oJsonReq);
						that.getOwnerComponent().setModel(oCredAppModel, "formDetails");

						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_loadHistory: function (sObjectPath) {
			var url = "/" + sObjectPath + "/HistorySetNav";
			var model = this.getModel();
			var that = this;

			model.read(url, {
				success: function (data) {
					var results = data.results;
					var logs = []; // Array to store the logs
					var parent; // Current parent log object

					results.forEach(function (result) {
						if (result.Level === 1) {
							// If the current result is a new parent log
							if (parent) {
								logs.push(parent); // Push the previous parent log to the array
							}
							parent = result; // Update the current parent log

							// Clear the attributes we dont need to display for the parent record
							parent.ActAgent = "";
							parent.ForAgent = "";
							parent.Date = "";
							parent.Time = "";

							parent.logs = []; // Create an array to store child logs
						} else {
							parent.logs.push(result); // Push child logs to the current parent
						}
					});

					if (parent) {
						logs.push(parent); // Push the last parent log to the array
					}

					// Save the model
					var historyData = {
						history: logs
					};

					// Set the payload details
					var historyModel = new JSONModel(historyData);
					that.getOwnerComponent().setModel(historyModel, "historyTable");

				},
				error: function (error) {
					console.error(error);
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = {},
				oViewModel = this.getModel("detailView");
				
			// Get the object based on the source
			if (this.iSource === 0) {
				oObject = oView.getModel().getObject(sPath);
			} else {
				oObject = this.getOwnerComponent().getModel().getObject("/");
				oObject = this._extractFormSet(oObject);
			}

			// Set the uuid for reading attachments
			if (oObject) {
				this.uuid = oObject.Refguid;
			}

			// Load attachments
			this._setAttachmentModel();

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);
		},
		
		_extractFormSet: function (oObject) {
			for (let key in oObject) {
		        if (key.startsWith("FormSet(")) {
		            return oObject[key];
		        }
		    }
		    return null; // Return null if no FormSet object is found
		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("detailView");

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},

		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},

		// display fragment
		_displayFragment: function (sFragmentName) {

			// Determine fragment name
			var sFragName = "com.epiuse.zhrorderamend.view.fragments." + sFragmentName;

			// Get the control to which we add the fragment
			var oPanel = this.byId("formDetails");
			oPanel.destroyContent();

			// Load the fragment
			Fragment.load({
				id: this.getView().getId(),
				name: sFragName,
				controller: this
			}).then(function (oForm) {
				// Add the new fragment to the panel and then display the panel
				oPanel.addContent(oForm);
				oPanel.setVisible(true);
			}.bind(this));
		},

		// Refresh view binding
		_refreshView: function () {
			var oModel = this.getView().getModel();
			oModel.refresh(true);
		},

		_refreshFormDetails: function () {
			var sPath = `/FormSet('${this.sWi}')`,
				oModel = this.getOwnerComponent().getModel(),
				that = this;

			oModel.read(sPath, {
				success: function (oData, response) {
					that._setFormModel(oData);
				},
				error: function (oError) {
					MessageToast.show("Request failed: " + oError.message);
				}
			});
		}
	});

});