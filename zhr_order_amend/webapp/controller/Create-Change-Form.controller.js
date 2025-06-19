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

		/* =========================================================== */
		/* event handlers                                              */
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

        _onEditMatched: function (oEvent) {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Get the Id for the form from the parameters
			this.sWi = oEvent.getParameter("arguments").wi;
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
		/* event handlers                                              */
		/* =========================================================== */

        // #region _performValidation
        // Validation - Handler for all validations against request
        _performValidation: function () {

			// Clear existing messages
			this.oMessageManager.removeAllMessages();

			const iErrors = 0;

			if (iErrors > 0) {

				// Display the message popup
				this.onMessagesButtonPress();

				return false;
			} else {
				return true;
			}
		},
        // #endregion

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

		/* =========================================================== */
		/* event handlers                                              */
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

        // #region onPlantConfirmationChange
        onPlantConfirmationChange: function (oEvent) {
            const sSelectedKey = oEvent.getSource().getSelectedKey();
            const oUploadHBox = this.byId("hbxUploadDocument");

            if (sSelectedKey === "Yes") {
                oUploadHBox.setVisible(true);
            } else {
                oUploadHBox.setVisible(false);
            }
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

        // #region onAddItem
        onAddItem: function () {
            const oModel = this.getView().getModel();

            // Handle both tables
            ["changeFromItems", "changeToItems"].forEach(function (sPath) {
                const aItems = oModel.getProperty("/" + sPath) || [];

                const oNewItem = {
                    lineNumber: aItems.length + 1,
                    uniqueCode: "",
                    quantity: "",
                    price: "",
                    totalAmount: "",
                    stockAmount: "",
                    deliveryDate: null
                };

                aItems.push(oNewItem);
                oModel.setProperty("/" + sPath, aItems);
            });

            // Show the total HBox since we now have at least one row
            const oHBoxChangeFrom = this.byId("hbxChangeFrom");
            const oHBoxChangeTo = this.byId("hbxChangeTo");
            if (oHBoxChangeFrom && oHBoxChangeTo) {
                oHBoxChangeFrom.setVisible(true);
                oHBoxChangeTo.setVisible(true);
            }
        },    
        // #endregion

        // #region onDeleteItem
        onDeleteItem: function (oEvent) {
            const oModel = this.getView().getModel();

            // Get the clicked row context and extract the lineNumber
            const oContext = oEvent.getSource().getBindingContext();
            const iLineNumber = oContext.getProperty("lineNumber");

            // Helper to filter out the matching row by lineNumber
            function removeByLineNumber(aItems) {
                return aItems.filter(function (item) {
                    return item.lineNumber !== iLineNumber;
                }).map(function (item, index) {
                    item.lineNumber = index + 1; // Re-number after deletion
                    return item;
                });
            }

            // Remove from both arrays
            const aChangeFrom = oModel.getProperty("/changeFromItems");
            const aChangeTo = oModel.getProperty("/changeToItems");

            const aUpdatedChangeFrom = removeByLineNumber(aChangeFrom);
            const aUpdatedChangeTo = removeByLineNumber(aChangeTo);

            oModel.setProperty("/changeFromItems", aUpdatedChangeFrom);
            oModel.setProperty("/changeToItems", aUpdatedChangeTo);

            // Hide the total HBox if there are no rows left
            const oHBoxChangeFrom = this.byId("hbxChangeFrom");
            const oHBoxChangeTo = this.byId("hbxChangeTo");
            if (oHBoxChangeFrom && oHBoxChangeTo && aUpdatedChangeFrom.length === 0) {
                oHBoxChangeFrom.setVisible(false);
                oHBoxChangeTo.setVisible(false);
            }
        } ,   
        // #endregion

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
				oUploadSet = this.getView().byId("usAttach");

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

        // #region onFormSubmit
        onFormSubmit: function () {
			this._ExtractChangeData();

			// Check for edit or new request
			const sWi = (this.sWi) ? this.sWi : "0";
            const uuid = this.uuid;

			// Get the form details
            const oModel = this.getOwnerComponent().getModel();
			const oFormReq = this.getOwnerComponent().getModel("formDetails").getData();
			const oChangeToData = this.getOwnerComponent().getModel("extractedOrderItems").getData();			
			
			// Convert note to nested array of objects
			const oNote = {
				Creator: this.sInitiator,
				RequestedBy: this.byId("txtRequestedBy").getText(),
				RequestedDate: this.byId("txtRequestedDate").getText(),
				Reason: oFormReq.reasonOfAmendments,
				ChangeToItems: oChangeToData.extractedItems,
				Initials: this._createInitials(this.sInitiator)
			}
			
			oFormReq.reasonOfAmendments = [oNote];

			// Perform validation
			const bValid = this._performValidation(oFormReq);
			
			// Submit the request
			if (bValid) {
				// Convert the form request details to json
				const sPayload = JSON.stringify(oFormReq),
					dCreateTime = new Date();

					console.log("payload: ", sPayload);
					

				// Format the create time
				const oFormat = DateFormat.getDateInstance({
					pattern: "PThh'H'mm'M'ss'S'"
				});

				// Build the details of the request
				const oEntity = {
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
				oModel.create("/FormSet", oEntity, {
					success: () => {
						// Display success message
						const sMsg = 'Request Created Successfully';
						MessageToast.show(sMsg);
						this.oRouter.navTo("master");
					},
					error: (oResponse) => {
						console.error(oResponse);
					}
				});
			}
		},
        // #endregion

		/* =========================================================== */
		/* Sales Orders Value Help                                           */
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
				console.log("Applying filter:", oFilter);
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
			const sAccountNoTxt = "Sales Document ID";
			const sAccountNameTxt = "Date Valid From";
		
			
			// Bind rows to the ODataModel
			oTable.bindRows({
				path: "/SalesOrderSet",
				events: {
					dataReceived: this._onDataReceived.bind(this, oDialog)
				}
			});
		
			// Add columns
			const oColumnAccountNo = this._createColumn(sAccountNoTxt, "SalesDocument");
			const oColumnAccountName = this._createColumn(sAccountNameTxt, "ValidFrom");
		
			oTable.addColumn(oColumnAccountNo);
			oTable.addColumn(oColumnAccountName);
		
			// Enable single selection mode
			oTable.setSelectionMode("Single");
		
			// Handle row selection to open detail dialog
			oTable.attachRowSelectionChange((oEvent) => {
				const iIndex = oEvent.getParameter("rowIndex");
				if (iIndex >= 0) {
					const oContext = oTable.getContextByIndex(iIndex);
					const oSalesOrder = oContext.getObject();
					if (oSalesOrder && oSalesOrder.SalesDocument) {
						this._openSalesOrderDetailDialog(oSalesOrder.SalesDocument);
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
		
		_createColumn: function (sLabelText, sFieldName) {
			const oLabel = new Label({
				text: sLabelText
			});
			const oTemplate = new sap.m.Text({
				wrapping: false,
				text: "{" + sFieldName + "}"
			});

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

		// #region Order Items VH
		_openSalesOrderDetailDialog: function (sSalesDocId) {
			const oModel = this.getOwnerComponent().getModel();
			this._sSalesOrderNo = sSalesDocId;

			sap.ui.core.BusyIndicator.show();

			oModel.read(`/SalesOrderSet`, {
				urlParameters: {
					"$filter": `substringof('${sSalesDocId}', SalesDocument)`
				},
				success: (oOrderData) => {		
					// Step 2: Read Sales Order Items (Expand from Navigation Property)
					oModel.read(`/SalesOrderSet`, {
						urlParameters: {
							"$filter": `substringof('${sSalesDocId}', SalesDocument)`,
							"$expand": "ToSalesOrderItems"
						},
						success: (oItemsData) => {
							const aItemsData = oItemsData?.results[0]?.ToSalesOrderItems.results;

							// Store header and items in a JSONModel
							const oOrderDetailsModel = new sap.ui.model.json.JSONModel({
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
			if (this._oSalesOrderDetailsDialog) {
				this._oSalesOrderDetailsDialog.destroy();
			}

			Fragment.load({
			name: "com.epiuse.zhrorderamend.view.fragments.Sales-Order-Details",
			controller: this
			}).then((oDialog) => {
				this._oSalesOrderDetailsDialog = oDialog;
				this.getView().addDependent(oDialog);
		
				// Set the order details model to the dialog
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
			var oDialog = oEvent.getSource().getParent();
			
			// Find the table within the dialog
			var oTable = oDialog.getContent()[0].getItems().find(function(item) {
				return item.isA("sap.m.Table");
			});
			
			if (!oTable) {
				MessageToast.show("Table not found");
				return;
			}
			
			// Get selected items from the table
			var aSelectedItems = oTable.getSelectedItems();
			
			if (aSelectedItems.length === 0) {
				MessageToast.show("Please select at least one item");
				return;
			}
			
			// Extract data from selected rows
			var aSelectedData = [];
			
			aSelectedItems.forEach((oSelectedItem) => {
				var oBindingContext = oSelectedItem.getBindingContext("orderDetails");
				if (oBindingContext) {
					var oItemData = oBindingContext.getObject();
					
					// Create a clean object with the required fields
					var oSelectedRowData = {
						Item: oItemData.Item,
						Material: oItemData.Material,
						Quantity: oItemData.Quantity,
						NetPrice: oItemData.NetPrice,
						NetValue: oItemData.NetValue
					};

					var oTextControl = this.byId("txtLineItem"); // use global ID if created via JS
			
					if (oTextControl) {
						oTextControl.setText(oItemData.Item);
					}
					
					aSelectedData.push(oSelectedRowData);
				}
			});
			
			// Create the final JSON model with selected items
			var oSelectedItemsModel = {
				selectedItems: aSelectedData,
				totalSelectedItems: aSelectedData.length,
				selectionTimestamp: new Date().toISOString()
			};
			
			// Save to a JSON model (you can modify this based on your needs)
			var oSelectedItemsJSONModel = new sap.ui.model.json.JSONModel(oSelectedItemsModel);
			
			// Set the model to the view or component (adjust the model name as needed)
			this.getView().setModel(oSelectedItemsJSONModel, "selectedOrderItems");

			if (aSelectedData.length > 0) {
				this.byId("hbxChangeFrom").setVisible(true);
				this.byId("hbxChangeTo").setVisible(true);
				this.byId("inSalesOrderNo").setValue(this._sSalesOrderNo);
			}

			this._oSalesOrderDetailsDialog.close();
			this._oSalesOrderDialog.close();
		},
		// #endregion

		// #region _ExtractChangeData
		_ExtractChangeData: function () {
			const oTable = this.byId("tblChangeTo");
			const aTableItems = oTable.getItems();
			const aExtractedData = [];
		
			aTableItems.forEach((oRow) => {
				const aCells = oRow.getCells();
				if (aCells.length === 6) {
					const sItem = aCells[0].getText();
					const sNewUniqueCode = aCells[1].getValue();
		
					const oQtyHBox = aCells[2];
					const oQuantityInput = oQtyHBox.getItems()[0];
					const oQuantityUnitCombo = oQtyHBox.getItems()[1];
					const sNewQuantity = oQuantityInput.getValue();
					const sNewQuantityUnit = oQuantityUnitCombo.getSelectedKey();
		
					const oPriceHBox = aCells[3];
					const oPriceInput = oPriceHBox.getItems()[0];
					const oPriceUnitCombo = oPriceHBox.getItems()[1];
					const sNewPrice = oPriceInput.getValue();
					const sNewPriceUnit = oPriceUnitCombo.getSelectedKey();
		
					const sNewTotalAmount = aCells[4].getValue();
		
					const oDatePicker = aCells[5];
					const sNewRequestedDate = oDatePicker.getValue(); // Format depends on configuration
		
					aExtractedData.push({
						Item: sItem,
						NewUniqueCode: sNewUniqueCode,
						NewQuantity: sNewQuantity,
						NewQuantityUnit: sNewQuantityUnit,
						NewPrice: sNewPrice,
						NewPriceUnit: sNewPriceUnit,
						NewTotalAmount: sNewTotalAmount,
						NewRequestedDate: sNewRequestedDate,
					});
				}
			});
		
			const oModel = new sap.ui.model.json.JSONModel({ extractedItems: aExtractedData });
			this.getOwnerComponent().setModel(oModel, "extractedOrderItems");			
		}
		// #endregion
		
    });
});