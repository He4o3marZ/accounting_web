/**
 * ReviewPane Component
 * Human review interface with bbox highlights and rule failure badges
 */

import React, { useState, useEffect } from 'react';
import './ReviewPane.css';

const ReviewPane = ({ 
  invoice, 
  ruleReport, 
  llmPatch, 
  evidenceSnippets, 
  onAccept, 
  onOverride, 
  onMarkUnknown,
  onApplyPatch 
}) => {
  const [selectedField, setSelectedField] = useState(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [patchSuggestions, setPatchSuggestions] = useState([]);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    if (llmPatch) {
      setPatchSuggestions(llmPatch);
    }
  }, [llmPatch]);

  const getFieldConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return '#4CAF50'; // Green
    if (confidence >= 0.6) return '#FF9800'; // Orange
    return '#F44336'; // Red
  };

  const getRuleFailureBadge = (fieldPath) => {
    const failures = ruleReport.failures.filter(f => f.path === fieldPath);
    if (failures.length === 0) return null;
    
    return (
      <div className="rule-failure-badge">
        <span className="failure-count">{failures.length}</span>
        <div className="failure-tooltip">
          {failures.map((failure, idx) => (
            <div key={idx} className="failure-item">
              <strong>{failure.rule}:</strong> {failure.reason}
              {failure.suggested_fix && (
                <div className="suggested-fix">
                  <em>Suggested: {failure.suggested_fix}</em>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getCategoryConfidenceBar = (confidence) => {
    if (!confidence) return null;
    
    return (
      <div className="category-confidence-bar">
        <div 
          className="confidence-fill" 
          style={{ 
            width: `${confidence * 100}%`,
            backgroundColor: getFieldConfidenceColor(confidence)
          }}
        />
        <span className="confidence-text">{Math.round(confidence * 100)}%</span>
      </div>
    );
  };

  const handleFieldClick = (fieldPath, fieldValue) => {
    setSelectedField({ path: fieldPath, value: fieldValue });
    setShowEvidence(true);
  };

  const handleAcceptSuggestion = (patch) => {
    onAccept(patch);
    setPatchSuggestions(prev => prev.filter(p => p.path !== patch.path));
  };

  const handleOverrideField = (fieldPath, newValue) => {
    onOverride(fieldPath, newValue);
  };

  const handleMarkUnknown = (fieldPath) => {
    onMarkUnknown(fieldPath);
  };

  const handleApplyPatch = () => {
    if (patchSuggestions.length > 0) {
      onApplyPatch(patchSuggestions);
    }
  };

  return (
    <div className="review-pane">
      <div className="review-header">
        <h3>Invoice Review</h3>
        <div className="review-status">
          <span className={`status-badge ${ruleReport.passed ? 'passed' : 'failed'}`}>
            {ruleReport.passed ? '✅ Rules Passed' : '❌ Rules Failed'}
          </span>
          {patchSuggestions.length > 0 && (
            <span className="patch-badge">
              🤖 {patchSuggestions.length} AI Suggestions
            </span>
          )}
        </div>
      </div>

      <div className="review-content">
        <div className="invoice-fields">
          <h4>Invoice Fields</h4>
          
          {/* Core Fields */}
          <div className="field-group">
            <h5>Core Information</h5>
            
            <div className="field-row">
              <label>Invoice Number:</label>
              <div className="field-value">
                <span 
                  className="field-text"
                  onClick={() => handleFieldClick('/invoice_number', invoice.invoice_number)}
                  style={{ 
                    borderColor: getFieldConfidenceColor(invoice.invoice_number.confidence),
                    cursor: 'pointer'
                  }}
                >
                  {invoice.invoice_number.value}
                </span>
                {getRuleFailureBadge('/invoice_number')}
                <span className="confidence-indicator">
                  {Math.round(invoice.invoice_number.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="field-row">
              <label>Invoice Date:</label>
              <div className="field-value">
                <span 
                  className="field-text"
                  onClick={() => handleFieldClick('/invoice_date', invoice.invoice_date)}
                  style={{ 
                    borderColor: getFieldConfidenceColor(invoice.invoice_date.confidence),
                    cursor: 'pointer'
                  }}
                >
                  {invoice.invoice_date.value}
                </span>
                {getRuleFailureBadge('/invoice_date')}
                <span className="confidence-indicator">
                  {Math.round(invoice.invoice_date.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className="field-row">
              <label>Vendor:</label>
              <div className="field-value">
                <span 
                  className="field-text"
                  onClick={() => handleFieldClick('/vendor/name', invoice.vendor.name)}
                  style={{ 
                    borderColor: getFieldConfidenceColor(invoice.vendor.name.confidence),
                    cursor: 'pointer'
                  }}
                >
                  {invoice.vendor.name.value}
                </span>
                {getRuleFailureBadge('/vendor/name')}
                <span className="confidence-indicator">
                  {Math.round(invoice.vendor.name.confidence * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Financial Fields */}
          <div className="field-group">
            <h5>Financial Information</h5>
            
            <div className="field-row">
              <label>Grand Total:</label>
              <div className="field-value">
                <span 
                  className="field-text"
                  onClick={() => handleFieldClick('/amounts/grand_total', invoice.amounts.grand_total)}
                  style={{ 
                    borderColor: getFieldConfidenceColor(invoice.amounts.grand_total.confidence),
                    cursor: 'pointer'
                  }}
                >
                  {invoice.amounts.grand_total.value} {invoice.amounts.currency.value}
                </span>
                {getRuleFailureBadge('/amounts/grand_total')}
                <span className="confidence-indicator">
                  {Math.round(invoice.amounts.grand_total.confidence * 100)}%
                </span>
              </div>
            </div>

            {invoice.amounts.subtotal && (
              <div className="field-row">
                <label>Subtotal:</label>
                <div className="field-value">
                  <span 
                    className="field-text"
                    onClick={() => handleFieldClick('/amounts/subtotal', invoice.amounts.subtotal)}
                    style={{ 
                      borderColor: getFieldConfidenceColor(invoice.amounts.subtotal.confidence),
                      cursor: 'pointer'
                    }}
                  >
                    {invoice.amounts.subtotal.value}
                  </span>
                  {getRuleFailureBadge('/amounts/subtotal')}
                  <span className="confidence-indicator">
                    {Math.round(invoice.amounts.subtotal.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}

            {invoice.amounts.tax_amount && (
              <div className="field-row">
                <label>Tax Amount:</label>
                <div className="field-value">
                  <span 
                    className="field-text"
                    onClick={() => handleFieldClick('/amounts/tax_amount', invoice.amounts.tax_amount)}
                    style={{ 
                      borderColor: getFieldConfidenceColor(invoice.amounts.tax_amount.confidence),
                      cursor: 'pointer'
                    }}
                  >
                    {invoice.amounts.tax_amount.value}
                  </span>
                  {getRuleFailureBadge('/amounts/tax_amount')}
                  <span className="confidence-indicator">
                    {Math.round(invoice.amounts.tax_amount.confidence * 100)}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="field-group">
            <h5>Line Items</h5>
            {invoice.line_items.map((item, index) => (
              <div key={index} className="line-item">
                <div className="field-row">
                  <label>Description:</label>
                  <div className="field-value">
                    <span 
                      className="field-text"
                      onClick={() => handleFieldClick(`/line_items/${index}/description`, item.description)}
                      style={{ 
                        borderColor: getFieldConfidenceColor(item.description.confidence),
                        cursor: 'pointer'
                      }}
                    >
                      {item.description.value}
                    </span>
                    {getRuleFailureBadge(`/line_items/${index}/description`)}
                    <span className="confidence-indicator">
                      {Math.round(item.description.confidence * 100)}%
                    </span>
                  </div>
                </div>

                {item.category && (
                  <div className="field-row">
                    <label>Category:</label>
                    <div className="field-value">
                      <span className="category-text">{item.category}</span>
                      {getCategoryConfidenceBar(item.category_confidence)}
                    </div>
                  </div>
                )}

                {item.total && (
                  <div className="field-row">
                    <label>Total:</label>
                    <div className="field-value">
                      <span 
                        className="field-text"
                        onClick={() => handleFieldClick(`/line_items/${index}/total`, item.total)}
                        style={{ 
                          borderColor: getFieldConfidenceColor(item.total.confidence),
                          cursor: 'pointer'
                        }}
                      >
                        {item.total.value}
                      </span>
                      {getRuleFailureBadge(`/line_items/${index}/total`)}
                      <span className="confidence-indicator">
                        {Math.round(item.total.confidence * 100)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Suggestions */}
        {patchSuggestions.length > 0 && (
          <div className="ai-suggestions">
            <h4>AI Suggestions</h4>
            {patchSuggestions.map((patch, index) => (
              <div key={index} className="suggestion-item">
                <div className="suggestion-header">
                  <span className="suggestion-field">{patch.path}</span>
                  <span className="suggestion-operation">{patch.op}</span>
                </div>
                <div className="suggestion-content">
                  <div className="suggestion-value">
                    <strong>New Value:</strong> {patch.value}
                  </div>
                  <div className="suggestion-rationale">
                    <strong>Reason:</strong> {patch.rationale}
                  </div>
                  <div className="suggestion-evidence">
                    <strong>Evidence:</strong> {patch.cites_bbox.join(', ')}
                  </div>
                </div>
                <div className="suggestion-actions">
                  <button 
                    className="btn-accept"
                    onClick={() => handleAcceptSuggestion(patch)}
                  >
                    Accept
                  </button>
                  <button 
                    className="btn-reject"
                    onClick={() => setPatchSuggestions(prev => prev.filter(p => p.path !== patch.path))}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
            
            <div className="suggestion-actions-bulk">
              <button 
                className="btn-apply-all"
                onClick={handleApplyPatch}
                disabled={patchSuggestions.length === 0}
              >
                Apply All Suggestions
              </button>
            </div>
          </div>
        )}

        {/* Rule Failures */}
        {ruleReport.failures.length > 0 && (
          <div className="rule-failures">
            <h4>Rule Failures</h4>
            {ruleReport.failures.map((failure, index) => (
              <div key={index} className="failure-item">
                <div className="failure-header">
                  <span className="failure-rule">{failure.rule}</span>
                  <span className="failure-path">{failure.path}</span>
                </div>
                <div className="failure-reason">{failure.reason}</div>
                {failure.suggested_fix && (
                  <div className="failure-suggestion">
                    <strong>Suggested Fix:</strong> {failure.suggested_fix}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Review Notes */}
        <div className="review-notes">
          <h4>Review Notes</h4>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Add notes about this review..."
            rows={4}
          />
        </div>

        {/* Action Buttons */}
        <div className="review-actions">
          <button className="btn-primary">Complete Review</button>
          <button className="btn-secondary">Save Draft</button>
          <button className="btn-danger">Reject Invoice</button>
        </div>
      </div>

      {/* Evidence Modal */}
      {showEvidence && selectedField && (
        <div className="evidence-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Field Evidence</h3>
              <button onClick={() => setShowEvidence(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="field-info">
                <strong>Field:</strong> {selectedField.path}
                <br />
                <strong>Value:</strong> {selectedField.value}
              </div>
              
              <div className="evidence-list">
                <h4>Supporting Evidence</h4>
                {evidenceSnippets
                  .filter(snippet => snippet.text.includes(selectedField.value))
                  .map((snippet, index) => (
                    <div key={index} className="evidence-item">
                      <div className="evidence-text">{snippet.text}</div>
                      <div className="evidence-context">{snippet.context}</div>
                      <div className="evidence-bbox">
                        Page: {snippet.page}, Bbox: {snippet.bbox.join(', ')}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPane;





