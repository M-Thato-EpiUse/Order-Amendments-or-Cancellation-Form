sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../utils/formatter",
	"sap/ui/core/format/DateFormat",
	'sap/m/MessageToast',
	'sap/m/MessagePopover',
	'sap/m/MessageItem',
	'sap/ui/core/message/ControlMessageProcessor',
	'sap/ui/core/message/Message',
	'sap/ui/core/library',
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	"sap/ui/core/Fragment",
	'sap/m/SearchField',
	'sap/ui/model/type/String',
	'sap/ui/table/Column',
	'sap/m/Label',
], function (BaseController, JSONModel, formatter, DateFormat, MessageToast, MessagePopover, MessageItem, ControlMessageProcessor,
	Message, coreLibrary, Filter, FilterOperator, Fragment, SearchField, TypeString, UIColumn, Label) {
	"use strict";

	var MessageType = coreLibrary.MessageType;

	return BaseController.extend("com.epiuse.zhrorderamend.controller.Create", {

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {

			// Set the router
			this.oRouter = this.getOwnerComponent().getRouter();

			this.oRouter.getRoute("create").attachPatternMatched(this._onObjectMatched, this);
			this.oRouter.getRoute("edit").attachPatternMatched(this._onEditMatched, this);

			// Set up validation messages display
			this.oMessageProcessor = new ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.oMessageManager.registerMessageProcessor(this.oMessageProcessor);
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		onFormSubmit: function (oEvent) {
			
			debugger;

			var that = this;

			// Check for edit or new request
			var sWi = (this.sWi) ? this.sWi : "0";

			// Get the form details
			var oFormReq = this.getOwnerComponent().getModel("formDetails").getData();
			
			// Convert note to nested array of objects
			var oNote = {
				Creator: this.sInitiator,
				Note: oFormReq.note,
				Initials: this._createInitials(this.sInitiator)
			}
			
			oFormReq.note = [oNote];

			// Perform validation
			var bValid = this._performValidation(oFormReq);

			// Submit the request
			if (bValid) {

				// Convert the form request details to json
				var sPayload = JSON.stringify(oFormReq),
					dCreateTime = new Date();

				// Format the create time
				var oFormat = DateFormat.getDateInstance({
					pattern: "PThh'H'mm'M'ss'S'"
				});

				// Build the details of the request
				var oEntity = {
					Process: 'CTAAF',
					Wi: sWi,
					CreateDate: new Date(),
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
						var sMsg = 'Request Created Successfully';
						MessageToast.show(sMsg);

						// Nav back to main page
						that.oRouter.navTo("master");
					},
					error: function (oResponse) {
						console.log(oResponse)
					}
				});

			}

		},

		// Handle click of message
		onMessagesButtonPress: function (oEvent) {

			var oMessagesButton = this.getView().byId("btnMsgs");

			if (!this._messagePopover) {
				this._messagePopover = new MessagePopover({
					items: {
						path: "message>/",
						template: new MessageItem({
							description: "{message>description}",
							type: "{message>type}",
							title: "{message>message}"
						})
					}
				});
				oMessagesButton.addDependent(this._messagePopover);
			}
			this._messagePopover.toggle(oMessagesButton);
		},

		// Handle navigating back
		onBackNav: function () {
			var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

			var dialog = new sap.m.Dialog({
				title: oBundle.getText("confirmationTitle"),
				type: sap.m.DialogType.Message,
				content: new sap.m.Text({
					text: oBundle.getText("confirmationMessage")
				}),
				beginButton: new sap.m.Button({
					text: oBundle.getText("confirmationButtonYes"),
					press: () => {
						dialog.close();
						// Perform the navigation back
						// window.history.back();

						this.oRouter.navTo("master");
					}
				}),
				endButton: new sap.m.Button({
					text: oBundle.getText("confirmationButtonNo"),
					press: function () {
						dialog.close();
					}
				}),
				afterClose: function () {
					dialog.destroy();
				}
			});

			dialog.open();
		},

		// Generate token for use in attachment upload
		onBeforeUploadStarts: function (oEvent) {
			var oHeaderItem = oEvent.getParameter("item"),
				slugVal = oHeaderItem.getFileName() + "," + this.uuid + ",ZCA_ATTACH";

			oHeaderItem.removeAllStatuses();

			oHeaderItem.addHeaderField(new sap.ui.core.Item({
				key: "slug",
				text: slugVal
			}));

			oHeaderItem.addHeaderField(new sap.ui.core.Item({
				key: "x-csrf-token",
				text: this.getOwnerComponent().getModel().getSecurityToken()
			}));
		},

		onUploadComplete: function (oEvent) {
			var oStatus = oEvent.getParameter("status"),
				oItem = oEvent.getParameter("item"),
				oUploadSet = this.getView().byId("usAttach");

			if (oStatus && oStatus !== 201) {
				oItem.setUploadState("Error");
				oItem.removeAllStatuses();
			} else {
				oUploadSet.removeIncompleteItem(oItem);
				this._setAttachmentModel();
			}
		},

		onRemovePressed: function (oEvent) {
			// Prevent the default confirmation popup
			oEvent.preventDefault();

			// Get the item details
			var oItem = oEvent.getSource(),
				sGuid = oItem.getBinding("fileName").getContext().getObject().Guid,
				that = this;

			// Build the path to the AttachmentSet entity
			var sPath = "/AttachmentSet('" + sGuid + "')";

			// Remove the attachment from the backend
			this.getOwnerComponent().getModel().remove(sPath, {
				success: function (oData) {

					// Refresh the list
					that._setAttachmentModel();

					sap.m.MessageToast.show("Attachment removed from request");
				},
				error: function (oData) {
					sap.m.MessageToast.show("Error occured reading data");
				}
			});
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		_filterTable: function (oFilter) {
		    var oSignatoriesVH = this._oSignatoriesVH;
		    var oModel = this.getOwnerComponent().getModel();
		
		    oSignatoriesVH.getTableAsync().then(function (oTable) {
		        if (oTable.bindRows) {
		            this._applyFilter(oTable, "rows", oFilter);
		        }
		        if (oTable.bindItems) {
		            this._applyFilter(oTable, "items", oFilter);
		        }
		
		        // This method must be called after binding update of the table.
		        oSignatoriesVH.update();
		    }.bind(this));
		},
		
		_applyFilter: function (oTable, sBinding, oFilter) {
		    var oBinding = oTable.getBinding(sBinding);
		    if (oBinding) {
		        oBinding.filter(oFilter);
		    }
		},

		_bindUITable: function (oTable, oDialog) {
			var oResourceBundle = this.getResourceBundle();
			var sUsernameTxt = oResourceBundle.getText("xcolUsername");
			var sEmployeeNameTxt = oResourceBundle.getText("xcolEmpName");

			// Bind rows to the ODataModel and add columns
			oTable.bindAggregation("rows", {
				path: "/UsersSet",
				events: {
					dataReceived: this._onDataReceived.bind(this, oDialog)
				}
			});

			var oColumnUsername = this._createColumn(sUsernameTxt, "Username");
			var oColumnEmployeeName = this._createColumn(sEmployeeNameTxt, "EmployeeName");

			oTable.addColumn(oColumnUsername);
			oTable.addColumn(oColumnEmployeeName);
		},

		_onDataReceived: function (oDialog) {
			oDialog.update();
		},

		_createColumn: function (sLabelText, sFieldName) {
			var oLabel = new Label({
				text: sLabelText
			});
			var oTemplate = new sap.m.Text({
				wrapping: false,
				text: "{" + sFieldName + "}"
			});

			var oColumn = new UIColumn({
				label: oLabel,
				template: oTemplate
			});

			oColumn.data({
				fieldName: sFieldName
			});

			return oColumn;
		},

		_bindMTable: function (oTable, oDialog) {
			var sUsernameTxt = this.getResourceBundle().getText("xcolUsername"),
				sEmployeeNameTxt = this.getResourceBundle().getText("xcolEmpName");

			// Bind items to the ODataModel and add columns
			oTable.bindAggregation("items", {
				path: "/UsersSet",
				template: new ColumnListItem({
					cells: [new Label({
						text: "{Username}"
					}), new Label({
						text: "{EmployeeName}"
					})]
				}),
				events: {
					dataReceived: function () {
						oDialog.update();
					}
				}
			});
			oTable.addColumn(new MColumn({
				header: new Label({
					text: sUsernameTxt
				})
			}));
			oTable.addColumn(new MColumn({
				header: new Label({
					text: sEmployeeNameTxt
				})
			}));
		},

		_onObjectMatched: function (oEvent) {

			var oUserInfoService = sap.ushell.Container.getService("UserInfo"),
				oUser = oUserInfoService.getUser();
				
			this.sInitiator = oUser.getFullName();

			// Init the attachment model
			var oAttachments = new JSONModel([]);
			oAttachments.items = [];
			this.getOwnerComponent().setModel(oAttachments, "oModelAttach");

			// Set the uuid for the instance of creation
			this.uuid = this._generateUUID();

			// Set the title of the view
			this.getView().byId("ttlCr").setText(this.getResourceBundle().getText("xhedCrHead"));

			// Reset Wi
			this.sWi = null;

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Get the Id for the form from the parameters
			var sType = oEvent.getParameter("arguments").type;

			if (sType === "new") {
				// Instantiate the model used to submit the request
				var oContAssess = {};

				// Set the the object to the model used by the form
				var oContAssessModel = new JSONModel(oContAssess);
				this.getOwnerComponent().setModel(oContAssessModel, "formDetails");
			}
		},

		_onEditMatched: function (oEvent) {

			// Set the title of the view
			this.getView().byId("ttlCr").setText(this.getResourceBundle().getText("xhedCrHeadEd"));

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Get the Id for the form from the parameters
			this.sWi = oEvent.getParameter("arguments").wi;
		},

		// Validation - Handler for all validations against request
		_performValidation: function (oForm) {

			// Clear existing messages
			this.oMessageManager.removeAllMessages();

			var iErrors = 0;

			if (iErrors > 0) {

				// Display the message popup
				this.onMessagesButtonPress();

				return false;
			} else {
				return true;
			}
		},

		// Add error message to message popover
		_addErrorMessage: function (sMsg) {
			this.oMessageManager.addMessages(
				new Message({
					message: sMsg,
					type: MessageType.Error,
					processor: this.oMessageProcessor
				})
			);
		},

		// Format numbers
		_formatNumber: function (sNum) {
			if (sNum) {
				return parseFloat(sNum).toFixed(2);
			}
		},

		// Generate unique instance id
		_generateUUID: function () {
			const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
			let uuid = '';
			for (let i = 0; i < 26; i++) {
				const randomIndex = Math.floor(Math.random() * characters.length);
				uuid += characters.charAt(randomIndex);
			}
			return uuid;
		}

	});

});