sap.ui.define([
    "./BaseController",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/format/DateFormat",
    'sap/m/MessageToast',
	'sap/m/MessagePopover',
	'sap/m/MessageItem',
	'sap/m/SearchField',
	'sap/m/Label',
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/ui/table/Column',
	"sap/ui/core/Fragment",
	'sap/ui/core/message/ControlMessageProcessor',
    'sap/ui/core/library'
],
function (BaseController, JSONModel, DateFormat, MessageToast, MessagePopover, MessageItem, SearchField, Label, Filter, FilterOperator, UIColumn, Fragment, ControlMessageProcessor, coreLibrary) {
    "use strict";

    const MessageType = coreLibrary.MessageType;

    return BaseController.extend("com.epiuse.zhrorderamend.controller.Create-Change-Form", {
        onInit() {
            this._setModel();
            this._setRouter();
            this._setMessageManager();
			this._setInputElements();
        },

		// ## to be moved
		onAmendmentSelect: function (oEvent) {
			const oChkAmendment = oEvent.getSource();
			const oChkCancellation = this.byId("chkCancellation");
			const bIsSelected = oChkAmendment.getSelected();
			const oTblChangeFrom = this.byId("tblChangeFrom");
			const oTblChangeTo = this.byId("tblChangeTo");
			
			oChkCancellation.setSelected(false);
			oTblChangeFrom.setHeaderText("Change From");
			oTblChangeTo.setVisible(true);
			this.byId("btnImport").setEnabled(bIsSelected);
		},

		onCancellationSelect: function (oEvent) {
			const oChkCancellation = oEvent.getSource();
			const oChkAmendment = this.byId("chkAmendment");
			const bIsSelected = oChkCancellation.getSelected();
			const oTblChangeFrom = this.byId("tblChangeFrom");
			const oTblChangeTo = this.byId("tblChangeTo");

			oChkAmendment.setSelected(false);
			oTblChangeTo.setVisible(!bIsSelected);
			this.byId("btnImport").setEnabled(bIsSelected);
			oTblChangeFrom.setHeaderText(bIsSelected ? "Cancellation" : "Change From");
		},
		// ##

		/* =========================================================== */
		/* Global Helper Functions                                     */
		/* =========================================================== */
		// #region Format Functions
		_unformatCurrency: function (formattedValue) {
			if (!formattedValue) return "";
		
			// Remove "R", spaces, and parse to float
			const raw = formattedValue
				.replace("R", "")
				.replace(/\s/g, "")
				.trim();
		
			const number = parseFloat(raw);
			return isNaN(number) ? "" : number.toString();
		},		

		_formatDate: function (value) {
			if (!value) return "";
			
			const oDate = new Date(value);
			if (isNaN(oDate.getTime())) return "";
			
			const day = oDate.getDate().toString().padStart(2, '0');
			const month = (oDate.getMonth() + 1).toString().padStart(2, '0');
			const year = oDate.getFullYear();
			
			return day + '/' + month + '/' + year;
		},

		_clearFormValues: function () {
			this._clearTableValues();
		},

		_clearTableValues: function () {
			// Request Info (left)
			this.byId("inCustomerName").setValue("");
			this.byId("inBranchName").setValue("");
			this.byId("dtpPoDate").setValue("");

			// Request Info (right)
			this.byId("inContractNo").setValue("");
			this.byId("inSalesOrderNo").setValue("");
			this.byId("chkAmendment").setSelected(false);
			this.byId("chkCancellation").setSelected(false);

			// Reason of Amendments
			this.byId("txtaReasonOfAmendments").setValue("");

			// Order Progress
			this.byId("chkNotPlannedOrManufatured").setSelected(false);
			this.byId("chkOrderProgressSelect").setSelected(false);
			this.byId("chkPlannedNotManufatured").setSelected(false);
			this.byId("chkManufacturingNotAllocated").setSelected(false);
			this.byId("chkStandardAndPromised").setSelected(false);
			this.byId("chkNonstandardAndPromised").setSelected(false);
			this.byId("chkNonstandardAndNotPromised").setSelected(false);

			// Change To Table
			this.byId("inUniqueCode").setValue("");
			this.byId("inQuantity").setValue("");
			this.byId("inNetPrice").setValue("");
			this.byId("txtNetValue").setText("R 0.00");
			this.byId("dtpNewRequestedDate").setValue("");

			// Attachment Upload
			this.getOwnerComponent().getModel("oModelAttach").setData("");
			this.getOwnerComponent().getModel("selectedOrderItems").setData("");
		},
		// #endregion

		/* =========================================================== */
		/* Initialization                                              */
		/* =========================================================== */
        // #region Initialisation
        _setModel:function () {
            const oModel = new JSONModel({
                changeFromItems: [],
                changeToItems: []
            });
            this.getView().setModel(oModel);
        },

        _setRouter:function () {
            this.oRouter = this.getOwnerComponent().getRouter();
			this.oRouter.getRoute("create").attachPatternMatched(this._onObjectMatched, this);
			this.oRouter.getRoute("edit").attachPatternMatched(this._onEditMatched, this);
        },

        _setMessageManager: function () {
            this.oMessageProcessor = new ControlMessageProcessor();
			this.oMessageManager = sap.ui.getCore().getMessageManager();
			this.oMessageManager.registerMessageProcessor(this.oMessageProcessor);
        },
        // #endregion

        // #region _onObjectMatched
        _onObjectMatched: function (oEvent) {
			const oUserInfoService = sap.ushell.Container.getService("UserInfo");
			const oUser = oUserInfoService.getUser();
				
			this.sInitiator = oUser.getFullName();

			// Init the attachment model
			const oAttachments = new JSONModel([]);
			oAttachments.items = [];
			this.getOwnerComponent().setModel(oAttachments, "oModelAttach");

			// Set the uuid for the instance of creation
			this.uuid = this._generateUUID();

			// Reset Wi
			this.sWi = null;

			//Set the layout property of the FCL control to 'OneColumn'
			this.getOwnerComponent().getModel("appView").setProperty("/layout", "OneColumn");

			// Get the Id for the form from the parameters
			const sType = oEvent.getParameter("arguments").type;

			if (sType === "new") {
				// Instantiate the model used to submit the request
				const oContAssess = {};

				// Set the the object to the model used by the form
				const oContAssessModel = new JSONModel(oContAssess);
				this.getOwnerComponent().setModel(oContAssessModel, "formDetails");
			}  
		},

        _onEditMatched: function () {
			this.getOwnerComponent().getModel("appView").setProperty("/layout", "OneColumn");

			const oFormDataModel = this.getOwnerComponent().getModel("globalFormDataModel")?.getData();

			if (oFormDataModel) {
				if (oFormDataModel.RequestTypeCancellation) {
					this.byId("tblChangeTo").setVisible(false); 
					this.byId("tblChangeFrom").setHeaderText("Cancellation");
				} else { 
					this.byId("tblChangeTo").setVisible(true); 
					this.byId("tblChangeFrom").setHeaderText("Change From");
				}
			} else {
				const oRouter = this.getOwnerComponent().getRouter();
				oRouter.navTo("master");
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
		},

		_setInputElements: function () {
			const oRequestedBy = this.byId("txtRequestedBy");
			const oRequestedDate = this.byId("txtRequestedDate");

			if (oRequestedDate) {
				const oToday = new Date();
				const sFormattedDate = oToday.getDate().toString().padStart(2, '0') + '/' +
									   (oToday.getMonth() + 1).toString().padStart(2, '0') + '/' +
									   oToday.getFullYear();
				oRequestedDate.setText(sFormattedDate);
			}

			if (oRequestedBy) {
				const sUsername = this._getUserName();
				oRequestedBy.setText(sUsername);
			}
		},		
        // #endregion

		/* =========================================================== */
		/* Validation                                                  */
		/* =========================================================== */
        // #region _performValidation
        _performValidation: function () {
			// Clear existing messages
			this.oMessageManager.removeAllMessages();
			const iErrors = 0;

			if (iErrors > 0) {
				this.onMessagesButtonPress();
				return false;
			} else {
				return true;
			}
		},

        onMessagesButtonPress: function () {
			const oMessagesButton = this.getView().byId("btnMsgs");

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
		// #endregion

		/* =========================================================== */
		/* Control Actions                                             */
		/* =========================================================== */
		// #region onNavBack
		onNavBack: function () {
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
		// #endregion

		// #region handleLiveChange
		handleLiveChange: function (oEvent) {
			const ValueState = coreLibrary.ValueState;
			const oTextArea = oEvent.getSource(),
				iValueLength = oTextArea.getValue().length,
				iMaxLength = oTextArea.getMaxLength(),
				sState = iValueLength > iMaxLength ? ValueState.Warning : ValueState.None;

			oTextArea.setValueState(sState);
		},
		// #endregion

        // #region onOrderProgressSelect
        onOrderProgressSelect: function (oEvent) {
            const oSelectedCheckBox = oEvent.getSource();
        
            // Only proceed if the checkbox was just selected
            if (oSelectedCheckBox.getSelected()) {
                // List of all checkbox IDs
                var aCheckBoxIds = [
                    "chk1", "chk2", "chk3", "chk4", "chk5", "chk6", "chk7"
                ];
        
                aCheckBoxIds.forEach((sId) => {
                    var oCheckBox = this.byId(sId);
                    if (oCheckBox && oCheckBox !== oSelectedCheckBox) {
                        oCheckBox.setSelected(false);
                    }
                });
            }
        } ,
        // #endregion

		/* =========================================================== */
		/* Change To/From Tables                                       */
		/* =========================================================== */
        // #region onAddItem
		onAddItem: function() {
			// Get the model that contains the selectedItems array
			var oModel = this.getView().getModel("selectedOrderItems");
			
			// Get the current data
			var oData = oModel.getData();
			
			// Ensure selectedItems array exists
			if (!oData.selectedItems) {
				oData.selectedItems = [];
			}
			
			// Create a new empty item object
			var oNewItem = {
				Item: "", // Line Item No will be empty for new items
				// Add any other default properties you need
				// These will be populated by the user via the input controls
			};
			
			// Add the new item to the array
			oData.selectedItems.push(oNewItem);
			
			// Update the model to refresh the binding
			oModel.setData(oData);
			
			// After the model update, modify the new row to have an Input for Line Item No
			setTimeout(function() {
				var oTable = this.byId("tblChangeTo");
				var aItems = oTable.getItems();
				
				if (aItems.length > 0) {
					var oNewRow = aItems[aItems.length - 1]; // Get the last (newly added) row
					var aCells = oNewRow.getCells();
					
					// Replace the Text control in the first cell with an Input control
					if (aCells[0] && aCells[0].getMetadata().getName() === "sap.m.Text") {
						// Create new Input control for Line Item No
						var oLineItemInput = new sap.m.Input({
							id: this.createId("inLineItemNo_" + (aItems.length - 1)),
							value: "{selectedOrderItems>Item}",
							placeholder: ""
						});
						
						// Remove the Text control and add the Input control
						oNewRow.removeCell(0);
						oNewRow.insertCell(oLineItemInput, 0);
						
						// Focus on the new input
						oLineItemInput.focus();
					}
				}
			}.bind(this), 100);
			
			// Make the total section visible if it's not already
			var oTotalBox = this.byId("hbxChangeTo");
			if (oTotalBox) {
				oTotalBox.setVisible(true);
			}
		},
        // onAddItem: function() {
		// 	// Get the model that contains the selectedItems array
		// 	var oModel = this.getView().getModel("selectedOrderItems");
			
		// 	// Get the current data
		// 	var oData = oModel.getData();
			
		// 	// Ensure selectedItems array exists
		// 	if (!oData.selectedItems) {
		// 		oData.selectedItems = [];
		// 	}
			
		// 	// Create a new empty item object
		// 	var oNewItem = {
		// 		Item: "", // Line Item No will be empty for new items
		// 		// Add any other default properties you need
		// 		// These will be populated by the user via the input controls
		// 	};
			
		// 	// Add the new item to the array
		// 	oData.selectedItems.push(oNewItem);
			
		// 	// Update the model to refresh the binding
		// 	oModel.setData(oData);
			
		// 	// Make the total section visible if it's not already
		// 	var oTotalBox = this.byId("hbxChangeTo");
		// 	if (oTotalBox) {
		// 		oTotalBox.setVisible(true);
		// 	}
			
		// 	// Optional: Focus on the first input of the new row
		// 	// You might need to delay this slightly to ensure the row is rendered
		// 	setTimeout(function() {
		// 		var oTable = this.byId("tblChangeTo");
		// 		var aItems = oTable.getItems();
		// 		if (aItems.length > 0) {
		// 			var oLastItem = aItems[aItems.length - 1];
		// 			var aInputs = oLastItem.getCells().filter(function(oCell) {
		// 				return oCell.getMetadata().getName() === "sap.m.Input";
		// 			});
		// 			if (aInputs.length > 0) {
		// 				aInputs[0].focus();
		// 			}
		// 		}
		// 	}.bind(this), 100);
		// },
        // #endregion

        // #region onDeleteItem
        onDeleteItem: function(oEvent) {
			// Get the button that was pressed
			const oButton = oEvent.getSource();
			
			// Get the list item (row) that contains this button
			const oListItem = oButton.getParent();
			
			// Get the binding context to identify which item to delete
			const oBindingContext = oListItem.getBindingContext("selectedOrderItems");
			
			if (!oBindingContext) {
				sap.m.MessageToast.show("Unable to identify the item to delete");
				return;
			}
			
			// Get the path of the item (e.g., "/selectedItems/2")
			const sPath = oBindingContext.getPath();
			
			// Extract the index from the path
			const aPathParts = sPath.split("/");
			const iIndex = parseInt(aPathParts[aPathParts.length - 1]);
			
			// Get the model and current data
			const oModel = this.getView().getModel("selectedOrderItems");
			const aSelectedItems = oModel.getProperty("/selectedItems") || [];
			
			// Validate index
			if (iIndex < 0 || iIndex >= aSelectedItems.length) {
				sap.m.MessageToast.show("Invalid item index");
				return;
			}
			
			// Show confirmation dialog
			sap.m.MessageBox.confirm("Are you sure you want to delete this item?", {
				title: "Confirm Deletion",
				onClose: (oAction) => {
					if (oAction === sap.m.MessageBox.Action.OK) {
						// Remove the item from the array
						aSelectedItems.splice(iIndex, 1);
						
						// Update the model with the modified array
						oModel.setProperty("/selectedItems", aSelectedItems);
						
						// Update totals for both tables
						this._updateTotalAmount();
						this._updateChangeToTotal();
						
						// Hide total boxes if no items remain
						if (aSelectedItems.length === 0) {
							var oChangeFromHBox = this.byId("hbxChangeFrom");
							var oChangeToHBox = this.byId("hbxChangeTo");
							
							if (oChangeFromHBox) {
								oChangeFromHBox.setVisible(false);
							}
							if (oChangeToHBox) {
								oChangeToHBox.setVisible(false);
							}
						}
						
						sap.m.MessageToast.show("Item deleted successfully");
					}
				}
			});
		},
        // #endregion

		// #region Change From Total
		_calculateTotalAmount: function() {
			const oModel = this.getView().getModel("selectedOrderItems");
			const aItems = oModel.getProperty("/selectedItems") || [];
			
			const fTotal = aItems.reduce(function(sum, item) {
				const fNetValue = parseFloat(item.NetValue) || 0;
				return sum + fNetValue;
			}, 0);
			
			return this._formatCurrency(fTotal);
		},

		// Function to update the total when data changes
		_updateTotalAmount: function() {
			const sTotalAmount = this._calculateTotalAmount();
			const oTotalText = this.byId("totalAmountText");
			if (oTotalText) oTotalText.setText(sTotalAmount);
		},

		_onSelectedItemsChanged: function() {			
			// Update the total amount
			this._updateTotalAmount();
			
			// Show the total HBox
			const oHBox = this.byId("hbxChangeFrom");
			if (oHBox) oHBox.setVisible(true);
		},
		// #endregion

		// #region Change To Total
		_calculateChangeToTotal: function() {
			const oTable = this.byId("tblChangeTo");
			const aItems = oTable.getItems();
			let fTotal = 0;
			
			aItems.forEach(function(oItem) {
				const aCells = oItem.getCells();
				// The Total Amount input is the 5th cell (index 4)
				const oTotalAmountInput = aCells[4];
				if (oTotalAmountInput && oTotalAmountInput.getText) {
					const sValue = oTotalAmountInput.getText();
					const fValue = parseFloat(sValue) || 0;
					fTotal += fValue;
				}
			});
			
			return this._formatCurrency(fTotal);
		},

		// Function to update the Change To total
		_updateChangeToTotal: function() {
			const sTotalAmount = this._calculateChangeToTotal();
			const oTotalText = this.byId("changeToTotalAmountText");			
			if (oTotalText) oTotalText.setText(sTotalAmount || "R0.00");
		},

		// Function to handle input changes in the Change To table
		_onTotalAmountInputChange: function() { this._updateChangeToTotal(); },

		// Function to attach change events to all Total Amount inputs
		_attachChangeToInputEvents: function() {
			const oTable = this.byId("tblChangeTo");
			const aItems = oTable.getItems();
			
			aItems.forEach(function(oItem) {
				const aCells = oItem.getCells();
				// The Total Amount input is the 5th cell (index 4)
				const oTotalAmountInput = aCells[4];
				if (oTotalAmountInput && oTotalAmountInput.attachChange) oTotalAmountInput.attachChange(this._onTotalAmountInputChange.bind(this));
			}.bind(this));
		},

		// Call this after the table is rendered or items are added
		// _onChangeToTableUpdateFinished: function() {
		// 	this._attachChangeToInputEvents();
		// 	this._updateChangeToTotal();
			
		// 	// Show the total HBox
		// 	const oHBox = this.byId("hbxChangeTo");
		// 	if (oHBox) oHBox.setVisible(true);
		// },

		_quantityUnitSelectionChange: function (oEvent) {
			// Get the source ComboBox that triggered the event
			const oComboBox = oEvent.getSource();
			const sSelectedKey = oComboBox.getSelectedKey();
			const oQuantity = this.byId("inQuantity");
			
			// Navigate up to get the current row (ColumnListItem)
			const oItem = oComboBox.getParent().getParent(); // HBox -> ColumnListItem
			const aCells = oItem.getCells();
			
			// Get the HBox in column 3 (index 3) that contains txtNetPriceUnit
			const oNetPriceHBox = aCells[3];
			if (oNetPriceHBox) {
				// txtNetPriceUnit is the second item in the HBox (index 1)
				const oNetPriceUnitText = oNetPriceHBox.getItems()[1];
				if (oNetPriceUnitText && oNetPriceUnitText.setText) {
					// Set the text based on selected unit
					if (sSelectedKey === "M") {
						oNetPriceUnitText.setText("R/M");
					} else if (sSelectedKey === "100M") {
						oNetPriceUnitText.setText("R/100M");
						this._calculateRowTotal("", oQuantity);
					} else if (sSelectedKey === "KG") {
						oNetPriceUnitText.setText("R/KG");
					}
				}
			}
		},

		_calculateRowTotal: function (oEvent, oQuantity) {			
			// Get the source of the event to find the current row
			const oSource = oEvent != "" ? oEvent.getSource() : oQuantity;
			const oItem = oSource.getParent().getParent(); // Navigate up to get the ColumnListItem
			const aCells = oItem.getCells();
			
			// Get quantity from the HBox in column 2 (index 2)
			const oQuantityHBox = aCells[2];
			let fQuantity = 0;
			let sQuantityUnit = "";
			
			if (oQuantityHBox) {
				const oQuantityInput = oQuantityHBox.getItems()[0]; // Input is first item in HBox
				const oQuantityUnitCombo = oQuantityHBox.getItems()[1]; // ComboBox is second item in HBox
				
				if (oQuantityInput && oQuantityInput.getValue) {
					const sQuantityValue = oQuantityInput.getValue();
					fQuantity = parseFloat(sQuantityValue) || 0;
				}
				
				if (oQuantityUnitCombo && oQuantityUnitCombo.getSelectedKey) {
					sQuantityUnit = oQuantityUnitCombo.getSelectedKey();
				}
			}
			
			// Get net price from the HBox in column 3 (index 3)
			const oNetPriceHBox = aCells[3];
			let fNetPrice = 0;
			if (oNetPriceHBox) {
				const oNetPriceInput = oNetPriceHBox.getItems()[0]; // Input is first item in HBox
				if (oNetPriceInput && oNetPriceInput.getValue) {
					const sNetPriceValue = oNetPriceInput.getValue();
					fNetPrice = parseFloat(sNetPriceValue) || 0;
				}
			}
			
			// Calculate line total based on quantity unit
			let fLineTotal = 0;
			if (sQuantityUnit === "100M") {
				// For 100M, divide quantity by 100 before multiplying with price
				fLineTotal = (fQuantity / 100) * fNetPrice;
			} else {
				// For M, KG, or any other unit, calculate normally
				fLineTotal = fQuantity * fNetPrice;
			}
			
			// Update the Total Amount display
			const oTotalAmountText = aCells[4]; // txtNetValue in column 4
			if (oTotalAmountText && oTotalAmountText.setText) {
				oTotalAmountText.setText(this._formatCurrency(fLineTotal.toFixed(2)));
			}
		
			this.calculateGrandTotal();
		},

		// _calculateRowTotal: function (oEvent) {
		// 	// Get the source of the event to find the current row
		// 	const oSource = oEvent.getSource();
		// 	const oItem = oSource.getParent().getParent(); // Navigate up to get the ColumnListItem
		// 	const aCells = oItem.getCells();
			
		// 	// Get quantity from the HBox in column 2 (index 2)
		// 	const oQuantityHBox = aCells[2];
		// 	let fQuantity = 0;
		// 	if (oQuantityHBox) {
		// 		const oQuantityInput = oQuantityHBox.getItems()[0]; // Input is first item in HBox
		// 		if (oQuantityInput && oQuantityInput.getValue) {
		// 			const sQuantityValue = oQuantityInput.getValue();
		// 			fQuantity = parseFloat(sQuantityValue) || 0;
		// 		}
		// 	}
			
		// 	// Get net price from the HBox in column 3 (index 3)
		// 	const oNetPriceHBox = aCells[3];
		// 	let fNetPrice = 0;
		// 	if (oNetPriceHBox) {
		// 		const oNetPriceInput = oNetPriceHBox.getItems()[0]; // Input is first item in HBox
		// 		if (oNetPriceInput && oNetPriceInput.getValue) {
		// 			const sNetPriceValue = oNetPriceInput.getValue();
		// 			fNetPrice = parseFloat(sNetPriceValue) || 0;
		// 		}
		// 	}
			
		// 	// Calculate line total (quantity * net price) and update the Total Amount display
		// 	const fLineTotal = fQuantity * fNetPrice;
		// 	const oTotalAmountText = aCells[4]; // txtNetValue in column 4
		// 	if (oTotalAmountText && oTotalAmountText.setText) {
		// 		oTotalAmountText.setText(this._formatCurrency(fLineTotal.toFixed(2)));
		// 	}

		// 	this.calculateGrandTotal();
		// },

		calculateGrandTotal: function () {
			const oTable = this.byId("tblChangeTo");
			const aItems = oTable.getItems();
			let fGrandTotal = 0;
			
			aItems.forEach(function(oItem) {
				const aCells = oItem.getCells();
				// The Total Amount text is in column 4 (index 4)
				const oTotalAmountText = aCells[4];
				
				if (oTotalAmountText && oTotalAmountText.getText) {
					const sValue = oTotalAmountText.getText();
					const sCleanValue = sValue.replace(/[R\s]/g, '').replace(/[^\d.-]/g, '');
					const fValue = parseFloat(sCleanValue) || 0;
					fGrandTotal += fValue;
				}
			});
			
			// Update the title control with the grand total
			const oTitleControl = this.byId("changeToTotalAmountText");
			if (oTitleControl && oTitleControl.setText) {
				oTitleControl.setText(this._formatCurrency(fGrandTotal.toFixed(2)));
			}
		},
		// #endregion

		/* =========================================================== */
		/* Sales Orders Value Help                                     */
		/* =========================================================== */
		// #region Sales Orders VH
		onOrderSearchVH: function () {
			this._oBasicSearchField = new SearchField();

			sap.ui.core.BusyIndicator.show();

			Fragment.load({
				id: this.getView().getId(),
				name: "com.epiuse.zhrorderamend.view.fragments.Sales-Order",
				controller: this
			}).then(function (oDialog) {
				let oFilterBar = oDialog.getFilterBar();

				this._oSalesOrderDialog = oDialog;

				this.getView().addDependent(oDialog);

				// Set Basic Search for FilterBar
				oFilterBar.setFilterBarExpanded(false);
				oFilterBar.setBasicSearch(this._oBasicSearchField);

				// Trigger filter bar search when the basic search is fired
				this._oBasicSearchField.attachSearch(function () {
					oFilterBar.search();
				});

				this._loadAccountsTable(oDialog);

				oDialog.open();
			}.bind(this));
		},

		onOrdersVHOkPress: function (oEvent) {
		    // Get the table and selected indices
		    let oTable = oEvent.getSource().getTable(),
		        aSelectedIndexes = oTable.getSelectedIndices(),
		        oModel = this.getView().getModel(),
		        aObjects = [];
		
		    // Loop through selected indices and get objects
		    aSelectedIndexes.forEach(function (iSelectedIndex) {
		        let oContext = oTable.getContextByIndex(iSelectedIndex),
		            oObject = oModel.getProperty(oContext.getPath());
		        aObjects.push(oObject);
		    });
		
		    // Add accounts to details and close the dialog
		    this._addAccountsToDetails(aObjects);
		    this._oSalesOrderDialog.close();
		},

		onOrdersVHClose: function () { this._oSalesOrderDialog.close(); },

		onOrdersVHAfterClose: function () { this._oSalesOrderDialog.destroy(); },	

		onOrdersVHAfterOpen: function(oEvent) {
			var oDialog = oEvent.getSource();
			
			// Get all buttons in the dialog
			var aButtons = oDialog.getButtons();
			
			aButtons.forEach(function(oButton) {
				// Check if this is the cancel button
				if (oButton.getText() === "Cancel" || oButton.getMetadata().getName() === "sap.m.Button") {
					var sText = oButton.getText();
					if (sText && sText.toLowerCase().includes("cancel")) {
						oButton.setIcon("sap-icon://cancel");
					}
				}
			});
		},

		onFilterBarSearch: function () {
			var sSearchQuery = this._oBasicSearchField.getValue(),
				oSearchFilter = new Filter("SalesDocument", FilterOperator.Contains, sSearchQuery);

			this._filterTable(oSearchFilter);
		},

		_filterTable: function (oFilter) {
		    const oAccountsVH = this._oSalesOrderDialog;
		
		    oAccountsVH.getTableAsync().then(function (oTable) {
		        if (oTable.bindRows) {
		            this._applyFilter(oTable, "rows", oFilter);
		        }
		        if (oTable.bindItems) {
		            this._applyFilter(oTable, "items", oFilter);
		        }
		
		        // This method must be called after binding update of the table.
		        oAccountsVH.update();
		    }.bind(this));
		},	
		
		_applyFilter: function (oTable, sBinding, oFilter) {
		    const oBinding = oTable.getBinding(sBinding);
		    if (oBinding) {
		        oBinding.filter(oFilter);
		    }
		},
		// #endregion

		/* =========================================================== */
		/* Orders Dialog Helpers                                       */
		/* =========================================================== */
		// #region Orders Dialog Helpers
		_loadAccountsTable: function (oDialog) {
			oDialog.getTableAsync().then((oTable) => {

				oTable.setModel(this.getOwnerComponent().getModel());

				// For Desktop and tabled the default table is sap.ui.table.Table
				if (oTable.bindRows) {
					this._bindUITable(oTable, oDialog);
				}

				oDialog.update();

				sap.ui.core.BusyIndicator.hide();
			});
		},

		_bindUITable: function (oTable, oDialog) {
			// Bind rows to the ODataModel
			oTable.bindRows({
				path: "/SalesOrderSet",
				events: {
					dataReceived: this._onDataReceived.bind(this, oDialog)
				}
			});
		
			// Add columns
			const oSalesDocument = this._createColumn("Sales Document", "SalesDocument");
			const oCreatedBy = this._createColumn("Created By", "CreatedBy");
			const oCurrency = this._createColumn("Currency", "Currency");
			const oValidFromDate = this._createColumn("Date Valid From", "ValidFrom", this._formatDate.bind(this));
			const oValidToDate = this._createColumn("Date Valid To", "ValidTo", this._formatDate.bind(this));

			oTable.addColumn(oSalesDocument);
			oTable.addColumn(oCreatedBy);
			oTable.addColumn(oCurrency);
			oTable.addColumn(oValidFromDate);
			oTable.addColumn(oValidToDate);
		
			// Enable single selection mode
			oTable.setSelectionMode("Single");
		
			// Handle row selection to open detail dialog
			oTable.attachRowSelectionChange((oEvent) => {
				const iIndex = oEvent.getParameter("rowIndex");
				if (iIndex >= 0) {
					const oContext = oTable.getContextByIndex(iIndex);
					const oSalesOrder = oContext.getObject();
					if (oSalesOrder && oSalesOrder.SalesDocument) {
						this._openSalesOrderDetailDialog(null, oSalesOrder.SalesDocument);
					}
				}
			});
		},	
		
		// Helper method to create columns for JSON model
		_createColumnForJSONModel: function(sLabel, sPath) {
			const oColumn = new sap.ui.table.Column({
				label: new sap.m.Label({ text: sLabel }),
				template: new sap.m.Text({
					text: {
						path: "salesOrderModel>" + sPath // Bind to the named JSON model
					}
				}),
				sortProperty: sPath,
				filterProperty: sPath
			});
			return oColumn;
		},

		_onDataReceived: function (oDialog) {
			oDialog.update();
		},
		
		_createColumn: function (sLabelText, sFieldName, fnFormatter) {
			const oLabel = new Label({
				text: sLabelText
			});
			
			let oTemplate;
			if (fnFormatter) {
				oTemplate = new sap.m.Text({
					wrapping: false,
					text: {
						path: sFieldName,
						formatter: fnFormatter
					}
				});
			} else {
				oTemplate = new sap.m.Text({
					wrapping: false,
					text: "{" + sFieldName + "}"
				});
			}
		
			const oColumn = new UIColumn({
				label: oLabel,
				template: oTemplate
			});
		
			oColumn.data({
				fieldName: sFieldName
			});
		
			return oColumn;
		},
		// #endregion

		/* =========================================================== */
		/* Sales Order Items Value Help                                */
		/* =========================================================== */
		// #region Order Items VH
		_openSalesOrderDetailDialog: function (oEvent, sSalesDocId) {
			const oModel = this.getOwnerComponent().getModel();
			const sSalesDocumentId = sSalesDocId || oEvent.getSource().getValue();
			this._sSalesOrderNo = sSalesDocumentId;

			sap.ui.core.BusyIndicator.show();

			oModel.read(`/SalesOrderSet`, {
				urlParameters: {
					"$filter": `substringof('${sSalesDocumentId}', SalesDocument)`
				},
				success: (oOrderData) => {		
					oModel.read(`/SalesOrderSet`, {
						urlParameters: {
							"$filter": `substringof('${sSalesDocumentId}', SalesDocument)`,
							"$expand": "ToSalesOrderItems"
						},
						success: (oItemsData) => {
							const aItemsData = oItemsData?.results[0]?.ToSalesOrderItems.results;

							// console.log("items: ", aItemsData);

							const oOrderDetailsModel = new JSONModel({
								header: oOrderData,
								items: aItemsData
							});
							
							// Load and show second dialog
							this._loadSalesOrderDetailsDialog(oOrderDetailsModel);

							this.getOwnerComponent().setModel(aItemsData, "salesOrderItemsModel");							
						},
						error: (oError) => {
							sap.m.MessageBox.error("Failed to load order items.");
							sap.ui.core.BusyIndicator.hide();
						}
					});
				},
				error: (oError) => {
					sap.m.MessageBox.error("Failed to load order header.");
					sap.ui.core.BusyIndicator.hide();
				}
			});
		},

		_loadSalesOrderDetailsDialog: function (oOrderDetailsModel) {
			if (this._oSalesOrderDetailsDialog) this._oSalesOrderDetailsDialog.destroy();

			Fragment.load({
			name: "com.epiuse.zhrorderamend.view.fragments.Sales-Order-Details",
			controller: this
			}).then((oDialog) => {
				this._oSalesOrderDetailsDialog = oDialog;
				this.getView().addDependent(oDialog);
				oDialog.setModel(oOrderDetailsModel, "orderDetails");
				oDialog.open();
			});

			sap.ui.core.BusyIndicator.hide();
		},	

		onSalesOrderBack: function () {
			this._oSalesOrderDetailsDialog.close();
		},	
		// #endregion

		// #region Sales Order Import		
		onSalesOrderImport: function(oEvent) {
			// Get the dialog (assuming this function is called from the dialog context)
			const oDialog = oEvent.getSource().getParent();
			
			// Find the table within the dialog
			const oTable = oDialog.getContent()[0].getItems().find(function(item) { return item.isA("sap.m.Table"); });
			
			if (!oTable) { MessageToast.show("Table not found"); return; }
			
			// Get selected items from the table
			const aSelectedItems = oTable.getSelectedItems();
			
			if (aSelectedItems.length === 0) { MessageToast.show("Please select at least one item"); return; }
			
			// Extract data from selected rows
			let aSelectedData = [];
			
			aSelectedItems.forEach((oSelectedItem) => {
				const oBindingContext = oSelectedItem.getBindingContext("orderDetails");
				if (oBindingContext) {
					const oItemData = oBindingContext.getObject();
					
					// Create a clean object with the required fields
					const oSelectedRowData = {
						Item: oItemData.Item,
						Material: oItemData.Material,
						Quantity: this._formatToTwoDecimals(oItemData.Quantity),
						NetPrice: this._formatCurrency(oItemData.NetPrice),
						NetValue: this._formatCurrency(oItemData.NetValue)
					};

					const oTextControl = this.byId("txtLineItem");
					if (oTextControl) oTextControl.setText(oItemData.Item);
					aSelectedData.push(oSelectedRowData);
				}
			});
			
			// Create the final JSON model with selected items
			const oSelectedItemsModel = {
				selectedItems: aSelectedData,
				totalSelectedItems: aSelectedData.length,
				selectionTimestamp: new Date().toISOString()
			};
			
			// Save to a JSON model (you can modify this based on your needs)
			const oSelectedItemsJSONModel = new sap.ui.model.json.JSONModel(oSelectedItemsModel);
			
			// Set the model to the view or component (adjust the model name as needed)
			this.getView().setModel(oSelectedItemsJSONModel, "selectedOrderItems");

			if (aSelectedData.length > 0) {
				this.byId("hbxChangeFrom").setVisible(true);
				this.byId("inSalesOrderNo").setValue(this._sSalesOrderNo);

				if (this.byId("tblChangeTo").getVisible()) this.byId("hbxChangeTo").setVisible(true);
			}

			this._oSalesOrderDetailsDialog?.close();
			this._oSalesOrderDialog?.close();
			this.byId("btnAddItem").setVisible(true);
		},
		// #endregion
		
		/* =========================================================== */
		/* Attachment Upload                                           */
		/* =========================================================== */
        // #region onBeforeUploadStarts
        onBeforeUploadStarts: function (oEvent) {
			const oHeaderItem = oEvent.getParameter("item");
			const slugVal = oHeaderItem.getFileName() + "," + this.uuid + ",ZCA_ATTACH";

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
        // #endregion

        // #region onUploadComplete
        onUploadComplete: function (oEvent) {
			const oStatus = oEvent.getParameter("status"),
				oItem = oEvent.getParameter("item"),
				oUploadSet = this.getView().byId("ufuUploadedDocument");

			if (oStatus && oStatus !== 201) {
				oItem.setUploadState("Error");
				oItem.removeAllStatuses();
			} else {
				oUploadSet.removeIncompleteItem(oItem);
				this._setAttachmentModel();
			}
		},
        // #endregion

        // #region onRemovePressed
        onRemovePressed: function (oEvent) {
			// Prevent the default confirmation popup
			oEvent.preventDefault();

			// Get the item details
			const oItem = oEvent.getSource(),
				sGuid = oItem.getBinding("fileName").getContext().getObject().Guid,
				that = this;

			// Build the path to the AttachmentSet entity
			const sPath = "/AttachmentSet('" + sGuid + "')";

			// Remove the attachment from the backend
			this.getOwnerComponent().getModel().remove(sPath, {
				success: function () {
					// Refresh the list
					that._setAttachmentModel();
					sap.m.MessageToast.show("Attachment removed from request");
				},
				error: function () {
					sap.m.MessageToast.show("Error occured reading data");
				}
			});
		},
        // #endregion

		/* =========================================================== */
		/* Form Submit                                                 */
		/* =========================================================== */
        // #region onFormSubmit
        onFormSubmit: function () {
			this._ExtractChangeFromData();
			this._ExtractChangeToData();

			// Check for edit or new request
			const sWi = (this.sWi) ? this.sWi : "0";
            const uuid = this.uuid;

			// Get the form details
            const oModel = this.getOwnerComponent().getModel();
			const oFormDetails = this.getOwnerComponent().getModel("formDetails").getData();
			const oChangeToData = this.getOwnerComponent().getModel("extractedChangeToItems").getData();			
			const oChangeFromData = this.getOwnerComponent().getModel("extractedChangeFromItems").getData();
			
			oFormDetails.Creator = this.sInitiator;
			oFormDetails.Initials = this._createInitials(this.sInitiator);
			oFormDetails.RequestedBy = this.byId("txtRequestedBy").getText();
			oFormDetails.RequestedDate = this.byId("txtRequestedDate").getText();
			oFormDetails.ChangeFromItems = oChangeFromData.extractedItems;
			oFormDetails.ChangeToItems = oChangeToData.extractedItems;
			oFormDetails.AttachmentId = this.uuid;		
			
			const sRequestTypeAmendment = oFormDetails.RequestTypeAmendment;
			const sRequestTypeCancellation = oFormDetails.RequestTypeCancellation;
			const sFormTitle = sRequestTypeAmendment ? "Amendment Request" : sRequestTypeCancellation ? "Cancellation Request" : "";					
			const sDetailsTitle = sRequestTypeAmendment ? "Amendment Request Form Details" : sRequestTypeCancellation ? "Cancellation Request Form Details" : "";					
			oFormDetails.Title = sDetailsTitle;			

			// Perform validation
			const bValid = this._performValidation(oFormDetails);	
			
			// Submit the request
			if (bValid) {
				// Convert the form request details to json
				const sPayload = JSON.stringify(oFormDetails),
					dCreateTime = new Date();					

				// Format the create time
				const oFormat = DateFormat.getDateInstance({
					pattern: "PThh'H'mm'M'ss'S'"
				});

				// Build the details of the request
				const oFormPayload = {
					Title: sFormTitle,
					Process: 'ORDAMD',
					Wi: sWi,
					CreateDate: new Date(),
					CreateTime: oFormat.format(dCreateTime),
					Status: "READY",
					Initiator: "",
					Payload: sPayload,
					Refguid: uuid
				} 		
								
				// Send the request to create the new form
				oModel.create("/FormSet", oFormPayload, {
					success: () => {
						// Display success message
						this._clearFormValues();
						const sMsg = 'Request Created Successfully';
						MessageToast.show(sMsg);
						this.oRouter.navTo("master");
					},
					error: (oError) => {
						console.error(oError);
					}
				});
			}
		},
        // #endregion

		// #region _ExtractChangeFromData
		_ExtractChangeFromData: function () {
			const oTable = this.byId("tblChangeFrom");
			const aTableItems = oTable.getItems();
			const aExtractedData = [];
		
			aTableItems.forEach((oRow) => {
				const aCells = oRow.getCells();
				if (aCells.length >= 6) {
					const sItem = aCells[0].getText(); // Line Item No.
					const sUniqueCode = aCells[1].getText(); // Unique Code
					const sQuantity = this._formatToTwoDecimals(aCells[2].getText()); // Quantity
		
					// Revert formatted price and total back to raw numbers
					const sFormattedPrice = aCells[3].getText();
					const sPrice = this._unformatCurrency(sFormattedPrice);
		
					const sFormattedTotalAmount = aCells[4].getText();
					const sTotalAmount = this._unformatCurrency(sFormattedTotalAmount);
		
					const oDatePicker = aCells[5];
					const sRequestedDate = oDatePicker.getValue();
		
					aExtractedData.push({
						Item: sItem,
						UniqueCode: sUniqueCode,
						Quantity: sQuantity,
						Price: sPrice,
						TotalAmount: sTotalAmount,
						RequestedDate: sRequestedDate,
					});
				}
			});
		
			const oModel = new sap.ui.model.json.JSONModel({ extractedItems: aExtractedData });
			this.getOwnerComponent().setModel(oModel, "extractedChangeFromItems");
		},		
		// #endregion

		// #region _ExtractChangeToData
		_ExtractChangeToData: function () {
			const oTable = this.byId("tblChangeTo");
			const aTableItems = oTable.getItems();
			const aExtractedData = [];
		
			aTableItems.forEach((oRow) => {
				const aCells = oRow.getCells();
		
				// Make sure the row has 7 cells (based on updated structure)
				if (aCells.length === 7) {
					// Cell 0: Line Item No. (Text)
					const sItem = aCells[0].getText();
		
					// Cell 1: Unique Code (Input)
					const sNewUniqueCode = aCells[1].getValue();
		
					// Cell 2: New Quantity (HBox with Input + ComboBox)
					const oQtyHBox = aCells[2];
					const oQuantityInput = oQtyHBox.getItems()[0];
					const oQuantityUnitCombo = oQtyHBox.getItems()[1];
					const sNewQuantity = this._formatToTwoDecimals(oQuantityInput.getValue());
					const sNewQuantityUnit = oQuantityUnitCombo.getSelectedKey();
		
					// Cell 3: New Price (HBox with Input + ComboBox)
					const oPriceHBox = aCells[3];
					const oPriceInput = oPriceHBox.getItems()[0];
					const oPriceUnitText = oPriceHBox.getItems()[1];
					const sNewPrice = oPriceInput.getValue();
					const sNewPriceUnit = oPriceUnitText.getText();
		
					// Cell 4: Total Amount (Input)
					const sNewTotalAmount = aCells[4].getText();
					const sCleanValue = sNewTotalAmount.replace(/[R\s]/g, '').replace(/[^\d.-]/g, '');
					const sNetValue = parseFloat(sCleanValue) || 0;
		
					// Cell 5: Requested Date (DatePicker)
					const oDatePicker = aCells[5];
					const sNewRequestedDate = oDatePicker.getValue();
		
					// Push extracted row object
					aExtractedData.push({
						Item: sItem,
						NewUniqueCode: sNewUniqueCode,
						NewQuantity: sNewQuantity,
						NewQuantityUnit: sNewQuantityUnit,
						NewPrice: sNewPrice,
						NewPriceUnit: sNewPriceUnit,
						NewTotalAmount: sNetValue,
						NewRequestedDate: sNewRequestedDate,
					});
				}
			});
		
			const oModel = new sap.ui.model.json.JSONModel({ extractedItems: aExtractedData });
			this.getOwnerComponent().setModel(oModel, "extractedChangeToItems");
		},
		// #endregion
		
    });
});