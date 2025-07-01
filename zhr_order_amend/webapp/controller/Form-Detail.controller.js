sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../utils/formatter",
	"sap/m/library",
	"sap/ui/core/Fragment",
	"sap/ui/core/format/DateFormat",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
	'sap/m/MessageToast',
	"../lib/html2pdf"
], function (BaseController, JSONModel, formatter, mobileLibrary, Fragment, DateFormat, Filter, FilterOperator, MessageToast, HTMLtoPDF) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("com.epiuse.zhrorderamend.controller.Form-Detail", {

		formatter: formatter,

        onInit: function () {
            const oRouter = this.getOwnerComponent().getRouter();
            const oRoute = oRouter.getRoute("object");

            // Attach handler to run every time the route is matched
            oRoute.attachPatternMatched(this._onObjectMatched, this);
        },

		// #region _getFormData
        _getFormData: function (sWorkItemId) {
            const oModel = this.getOwnerComponent().getModel();
			
			oModel.read(`/FormSet('${sWorkItemId}')`, {
				success: (oFormData) => {                    
                    if (oFormData) {
                        const sPayload = oFormData.Payload;
                        const oPayload = JSON.parse(sPayload);
						const sPoDate = /^\d{2}\/\d{2}\/\d{4}$/.test(oPayload.PoDate) ? oPayload.PoDate : this._formatDateToDDMMYYYY(new Date(oPayload.PoDate));
						const sRequestTypeAmendment = oPayload.RequestTypeAmendment;
						const sRequestTypeCancellation = oPayload.RequestTypeCancellation;
						const sRequestType = sRequestTypeAmendment ? "Amendment" : sRequestTypeCancellation ? "Cancellation" : "";							
						const sOrderProgress = 
								oPayload.NotPlannedOrManufatured ? "Not planned nor manufactured" :
								oPayload.PlannedNotManufatured ? "Planned but not yet manufactured" :
								oPayload.ManufaturingAllocated ? "Manufacturing but can be allocated to other orders" :
								oPayload.ManufacturingNotAllocated ? "Manufacturing and cannot be allocated to other orders" :
								oPayload.StandardAndPromised ? "Standard product and is promised to be sold out quickly" :
								oPayload.NonstandardAndPromised ? "Nonstandard product and is promised to be sold out quickly" :
								oPayload.NonstandardAndNotPromised ? "Nonstandard product and cannot be promised to be sold out quickly" :
							"";						

						oPayload?.ChangeToItems?.forEach(item => {
							const sNewTotalAmount = item.NewTotalAmount;
							const bIsNumber = !isNaN(sNewTotalAmount) && !isNaN(parseFloat(sNewTotalAmount));
							const sCleanValue = !bIsNumber ? sNewTotalAmount.replace(/[R\s]/g, '').replace(/[^\d.-]/g, '') : sNewTotalAmount;
							const sNewNetValue = parseFloat(sCleanValue) || 0;
							item.NewTotalAmount = sNewNetValue;
						});						

						const oFormPayload = new JSONModel(oPayload);
						this.getView().setModel(oFormPayload, "formDataModel"); 	
						this.getOwnerComponent().setModel(oFormPayload, "globalFormDataModel"); 	

						const formattedChangeFromItems = oPayload.ChangeFromItems.map(item => {
							return {
								...item,
								Price: this._formatCurrency(item.Price),
								TotalAmount: this._formatCurrency(item.TotalAmount)
							};
						});
						
						const oChangeFromModel = new JSONModel({ selectedItems: formattedChangeFromItems });
						this.getOwnerComponent().setModel(oChangeFromModel, "selectedOrderItems");

						const oChangeToModel = new JSONModel({ selectedItems: oPayload.ChangeToItems });
						this.getOwnerComponent().setModel(oChangeToModel, "changeToItems");								
						
						this.byId("tbldChangeTo").setVisible(!sRequestTypeCancellation);
						this.byId("tbldChangeFrom").setHeaderText(sRequestTypeCancellation ? "Cancellation" : "Change From");

                        this.byId("txtDetailTitle").setText(oPayload.Title || "Amendment/Cancellation Request Form Details");

                        this.byId("oaWorkItem").setText(oFormData.Wi);
                        this.byId("oaCreatedDate").setText(formatter.formatLongDate(oFormData.CreateDate, oFormData.CreateTime));

                        this.byId("txtdRequestedBy").setText(oPayload.RequestedBy);
                        this.byId("txtdCustomerName").setText(oPayload.CustomerName);
                        this.byId("txtdBranchName").setText(oPayload.BranchOrSectorName);
						this.byId("txtdPoDate").setText(sPoDate);
                        
                        this.byId("txtdRequstDate").setText(oPayload.RequestedDate);
                        this.byId("txtdContractNumber").setText(oPayload.PoContractNumber);
                        this.byId("txtdSalesOrderNo").setText(oPayload.SalesOrderNumber);
                        this.byId("txtdRequestType").setText(sRequestType);

                        this.byId("txtReasonOfAmendments").setText(oPayload.ReasonOfAmendments);
                        this.byId("txtOrderProgress").setText(sOrderProgress);

						this._getUploadedAttachment(oPayload.AttachmentId);
                    }
				}
			})
        },
		// #endregion

		// #region _getUploadedAttachment
		_getUploadedAttachment: function (sAttachmentId) {			
			if (sAttachmentId) {
				this.getOwnerComponent().getModel().read("/AttachmentSet", {
					filters: [new Filter("Refguid", FilterOperator.EQ, sAttachmentId)],
					success: (oAttachmentData) => {
						const oAttachmentDetails = oAttachmentData.results[0];
						
						if (oAttachmentDetails) {
							const item = {
								Guid: oAttachmentDetails.Guid,
								FileName: oAttachmentDetails.Filename,
								MimeType: oAttachmentDetails.Mimetype,
								Url: `/sap/opu/odata/sap/ZHR_FIORI_FORMS_SRV/AttachmentSet('${oAttachmentDetails.Guid}')/$value`,
								uploadState: "Complete",
								CreatedBy: oAttachmentDetails.Createdby,
								CreatedDate: this._formatDateToDDMMYYYY(oAttachmentDetails.Erdat),
								selected: false
							};
			
							const oAttachmentModel = new JSONModel({ AttachmentDetails: item });
							this.getOwnerComponent().setModel(oAttachmentModel, "uploadedAttachmentModel");
							this.getOwnerComponent().getModel("oModelAttach")?.setData(oAttachmentModel) || 
							this.getOwnerComponent().setModel(oAttachmentModel, "oModelAttach");							
						}						
					},
					error: (oError) => {
						sap.m.MessageToast.show("Error occurred reading data");
						console.error(oError);
					}
				});
			} else {
				const oAttachmentModel = new JSONModel({ AttachmentDetails: "" });
				this.getOwnerComponent().setModel(oAttachmentModel, "uploadedAttachmentModel");
			}
		},
		// #endregion

		// #region Helper Functions
        _extractWorkItemNumberFromURL: function () {
            const sUrl = window.location.href;
            const match = sUrl.match(/\/FormSet\/(\d+)$/);
            return match ? match[1] : null;
        }, 

        _onObjectMatched: function (oEvent) {
            const sWorkItemId = oEvent.getParameter("arguments").objectId;
			this._sWorkItemId = sWorkItemId;			
            this._getFormData(sWorkItemId);
        },
        
        _setRouter: function () {
			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("wfobject").attachPatternMatched(this._onObjectMatchedWF, this);
        },
		// #endregion

        // #region onEdit
		onEdit: function () {
			const oRouter = this.getOwnerComponent().getRouter();

			oRouter.navTo("edit", { workItemId: this._sWorkItemId });
		},

		// onEdit: function () {

		// 	// Get the payload of the form to be resubmitted
		// 	var oFormReq = oEvent.getSource().getBindingContext().getObject(),
		// 		oPayload,
		// 		sWi = this.getView().getBindingContext().getObject().Wi;

		// 	// Parse the string to object
		// 	if (oFormReq.Payload) {
		// 		oPayload = JSON.parse(oFormReq.Payload);
		// 	}
			
		// 	// Convert the date time format to usuable format
		// 	if (oPayload.closingDateTime) {
		// 		oPayload.closingDateTime = new Date(oPayload.closingDateTime);
		// 	}
			
		// 	if (oPayload.validityPeriodStart) {
		// 		oPayload.validityPeriodStart = new Date(oPayload.validityPeriodStart);
		// 	}
			
		// 	if (oPayload.validityPeriodEnd) {
		// 		oPayload.validityPeriodEnd = new Date(oPayload.validityPeriodEnd);
		// 	}
			
		// 	if (oPayload.fixFirmPeriodStart) {
		// 		oPayload.fixFirmPeriodStart = new Date(oPayload.fixFirmPeriodStart);
		// 	}
			
		// 	if (oPayload.fixFirmPeriodEnd) {
		// 		oPayload.fixFirmPeriodEnd = new Date(oPayload.fixFirmPeriodEnd);
		// 	}

		// 	// Set the payload details
		// 	var oOrderAmendmentsModel = new JSONModel(oPayload);
		// 	this.getOwnerComponent().setModel(oOrderAmendmentsModel, "formDetails");

		// 	//Set the layout property of the FCL control to 'OneColumn'
		// 	this.getModel("appView").setProperty("/layout", "OneColumn");

		// 	// Navigate to create a new form
		// 	this.oRouter.navTo("edit", {
		// 		wi: sWi
		// 	});
		// },
		// #endregion

        // #region onResubmit
		onResubmit: function (oEvent) {
			// Get the payload of the form to be resubmitted
			const oFormReq = oEvent.getSource().getBindingContext().getObject();
			let oPayload;

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
			const oCredAppModel = new JSONModel(oPayload);
			this.getOwnerComponent().setModel(oCredAppModel, "formDetails");

			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");

			// Navigate to create a new form
			this.oRouter.navTo("create", {
				type: "resub"
			});
		},
		// #endregion

		/* =========================================================== */
		/* Deatil Close and Toggle Buttons                             */
		/* =========================================================== */
		// #region Detail Buttons
        onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

        toggleFullScreen: function () {
			const bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
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
        // #endregion

		/* =========================================================== */
		/* Export Form to PDF                                          */
		/* =========================================================== */
		// #region onExportPDF
		onExportPDF: function() {
			try {
				// Show busy indicator
				this.getView().setBusy(true);
				
				// Get all the data from the view elements
				const pdfData = this._collectFormData();
				
				// Generate PDF content
				this._generatePDF(pdfData);
				
			} catch (error) {
				console.error("Error generating PDF:", error);
				sap.m.MessageToast.show("Error occurred while generating PDF");
			} finally {
				this.getView().setBusy(false);
			}
		},
		// #endregion
		
		// #region _collectFormData
		_collectFormData: function() {
			// Collect header information
			const headerData = {
				title: this.byId("txtDetailTitle").getText(),
				workItem: this.byId("oaWorkItem").getText(),
				createdDate: this.byId("oaCreatedDate").getText(),
				requestedBy: this.byId("txtdRequestedBy").getText(),
				customerName: this.byId("txtdCustomerName").getText(),
				branchName: this.byId("txtdBranchName").getText(),
				poDate: this.byId("txtdPoDate").getText(),
				requestedDate: this.byId("txtdRequstDate").getText(),
				contractNumber: this.byId("txtdContractNumber").getText(),
				salesOrderNo: this.byId("txtdSalesOrderNo").getText(),
				requestType: this.byId("txtdRequestType").getText(),
				reasonOfAmendments: this.byId("txtReasonOfAmendments").getText(),
				orderProgress: this.byId("txtOrderProgress").getText()
			};
		
			// Collect table data
			const changeFromItems = this.getModel("formDataModel").getProperty("/ChangeFromItems") || [];
			const changeToItems = this.getModel("formDataModel").getProperty("/ChangeToItems") || [];
			
			// Collect attachment data
			const attachmentData = this.getModel("uploadedAttachmentModel") ? this.getModel("uploadedAttachmentModel").getData().AttachmentDetails : [];
		
			return {
				header: headerData,
				changeFromItems: changeFromItems,
				changeToItems: changeToItems,
				attachments: attachmentData
			};
		},
		// #endregion
		
		// #region _generatePDF
		_generatePDF: function(data) {
			// Create a new window for PDF generation
			const printWindow = window.open('', '_blank');
			
			// Generate HTML content for PDF
			const htmlContent = this._buildPDFHTML(data);
			
			// Write content to new window
			printWindow.document.write(htmlContent);
			printWindow.document.close();
			
			// Wait for content to load then trigger print
			printWindow.onload = function() {
				printWindow.print();
				// Close window after printing (optional)
				printWindow.onafterprint = function() {
					printWindow.close();
				};
			};
		},
		// #endregion
		
		// #region _buildPDFHTML
		_buildPDFHTML: function(data) {
			const currentDate = this._formatDateToDDMMYYYY(new Date());
			const isCancellation = data.header.requestType === "Cancellation";
			
			return `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Order Amendment Form</title>
				<style>
					body { 
						font-family: Arial, sans-serif; 
						margin: 20px; 
						font-size: 12px;
						color: #333;
					}
					.header { 
						text-align: center; 
						margin-bottom: 30px;
						border-bottom: 2px solid #0070f0;
						padding-bottom: 15px;
					}
					.form-section { 
						margin-bottom: 25px; 
						page-break-inside: avoid;
					}
					.form-row { 
						display: flex; 
						margin-bottom: 8px; 
						align-items: center;
					}
					.form-label { 
						font-weight: bold; 
						width: 200px; 
						margin-right: 15px;
					}
					.form-value { 
						flex: 1;
						border-bottom: 1px dotted #ccc;
						padding-bottom: 2px;
					}
					.section-title {
						background-color: #f5f5f5;
						padding: 10px;
						font-weight: bold;
						font-size: 14px;
						margin: 20px 0 10px 0;
						border-left: 4px solid #0070f0;
					}
					table { 
						width: 100%; 
						border-collapse: collapse; 
						margin: 10px 0;
						font-size: 11px;
					}
					th, td { 
						border: 1px solid #ddd; 
						padding: 8px; 
						text-align: left; 
					}
					th { 
						background-color: #f8f9fa;
						font-weight: bold;
					}
					.two-column {
						display: flex;
						gap: 30px;
					}
					.column {
						flex: 1;
					}
					.attachment-info {
						background-color: #f9f9f9;
						padding: 10px;
						border: 1px solid #ddd;
						border-radius: 4px;
					}
					@media print {
						body { margin: 0; }
						.page-break { page-break-before: always; }
					}
				</style>
			</head>
			<body>
				<div class="header">
					<h1>${data.header.title || 'Order Amendment Form'}</h1>
					<h4>Generated on: ${currentDate}</h4>
				</div>
		
				<div class="section-title">Request Information</div>
				<div class="two-column">
					<div class="column">
						<div class="form-row">
							<span class="form-label">Work Item:</span>
							<span class="form-value">${data.header.workItem || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">Requested By:</span>
							<span class="form-value">${data.header.requestedBy || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">Customer Name:</span>
							<span class="form-value">${data.header.customerName || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">Branch/Sector Name:</span>
							<span class="form-value">${data.header.branchName || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">PO Date:</span>
							<span class="form-value">${data.header.poDate || ''}</span>
						</div>
					</div>
					<div class="column">
						<div class="form-row">
							<span class="form-label">Created Date:</span>
							<span class="form-value">${data.header.createdDate || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">Requested Date:</span>
							<span class="form-value">${data.header.requestedDate || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">PO/Contract No.:</span>
							<span class="form-value">${data.header.contractNumber || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">Sales Order No.:</span>
							<span class="form-value">${data.header.salesOrderNo || ''}</span>
						</div>
						<div class="form-row">
							<span class="form-label">Request Type:</span>
							<span class="form-value">${data.header.requestType || ''}</span>
						</div>
					</div>
				</div>
		
				 ${isCancellation 
					? this._buildTableHTML('Cancellation', data.changeFromItems, 'from')
					: this._buildTableHTML('Change From', data.changeFromItems, 'from') + this._buildTableHTML('Change To', data.changeToItems, 'to')
				}
		
				<div class="section-title">Additional Information</div>
				<div class="form-section">
					<div class="form-row">
						<span class="form-label">Reason of Amendments:</span>
					</div>
					<div style="margin-top: 5px; padding: 10px; border: 1px solid #ddd; min-height: 40px;">
						${data.header.reasonOfAmendments || ''}
					</div>
				</div>
		
				<div class="form-section">
					<div class="form-row">
						<span class="form-label">Order Progress:</span>
					</div>
					<div style="margin-top: 5px; padding: 10px; border: 1px solid #ddd; min-height: 40px;">
						${data.header.orderProgress || ''}
					</div>
				</div>
		
				${this._buildAttachmentHTML(data.attachments)}
			</body>
			</html>`;
		},
		// #endregion
		
		// #region _buildTableHTML
		_buildTableHTML: function(title, items, type) {
			if (!items || items.length === 0) {
				return `<div class="section-title">${title}</div><p>No items found.</p>`;
			}
		
			const isChangeFrom = type === 'from';
			
			let tableHTML = `
				<div class="section-title">${title}</div>
				<table>
					<thead>
						<tr>
							<th>Line Item No.</th>
							<th>Unique Code</th>
							<th>${isChangeFrom ? 'Quantity' : 'New Quantity'}</th>
							<th>${isChangeFrom ? 'Price' : 'New Price'}</th>
							<th>Total Amount (R)</th>
							<th>${isChangeFrom ? 'Previous Requested Date' : 'New Requested Date'}</th>
						</tr>
					</thead>
					<tbody>`;
		
			items.forEach(item => {
				tableHTML += `
					<tr>
						<td>${item.Item || ''}</td>
						<td>${isChangeFrom ? (item.UniqueCode || '') : (item.NewUniqueCode || '')}</td>
						<td>${isChangeFrom ? (item.Quantity || '') : (item.NewQuantity || '')}</td>
						<td>${isChangeFrom ? (this._formatCurrency(item.Price) || '') : (this._formatCurrency(item.NewPrice) || '')}</td>
						<td>${isChangeFrom ? (this._formatCurrency(item.TotalAmount) || '') : (this._formatCurrency(item.NewTotalAmount) || '')}</td>
						<td>${isChangeFrom ? (item.RequestedDate || '') : (item.NewRequestedDate || '')}</td>
					</tr>`;
			});
		
			tableHTML += `
					</tbody>
				</table>`;
			
			return tableHTML;
		},
		// #endregion
		
		// #region _buildAttachmentHTML
		_buildAttachmentHTML: function(attachments) {
			if (!attachments || (Array.isArray(attachments) && attachments.length === 0)) {
				return `
					<div class="section-title">Plant Confirmation</div>
					<p>Plant confirmation: Yes</p>
					<p>No attachments available.</p>`;
			}
		
			// Handle both single attachment object and array
			const attachmentList = Array.isArray(attachments) ? attachments : [attachments];
			
			let attachmentHTML = `
				<div class="section-title">Plant Confirmation</div>
				<p>Plant confirmation (Written email attached to this application form can be counted as the confirmation from plant): Yes</p>
				<div class="attachment-info">
					<strong>Attachments:</strong><br>`;
		
			attachmentList.forEach(attachment => {
				if (attachment && attachment.FileName) {
					attachmentHTML += `
						<div style="margin: 5px 0;">
							<strong>File:</strong> ${attachment.FileName}<br>
							${attachment.CreatedBy ? `<strong>Created By:</strong> ${attachment.CreatedBy}<br>` : ''}
							${attachment.CreatedDate ? `<strong>Created Date:</strong> ${attachment.CreatedDate}<br>` : ''}
						</div>`;
				}
			});
		
			attachmentHTML += `</div>`;
			return attachmentHTML;
		}
		// #endregion

    });

});