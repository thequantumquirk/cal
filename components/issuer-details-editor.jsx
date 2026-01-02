"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Building, FileText, Save, X, AlertTriangle, Shield } from "lucide-react"
import { toast } from "sonner"
import DocumentUpload from "./document-upload"
import { useAuth } from "@/contexts/AuthContext"
import { ISSUER_STATUS_OPTIONS } from "@/lib/issuer-status"

const FORM_STATUS_OPTIONS = [
  "FILED",
  "OBTAINED",
  "PENDING"
]

export default function IssuerDetailsEditor({ issuerId, onClose, onSave }) {
  const { isSuperAdmin } = useAuth()
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    status: "active",
    issuer_name: "",
    display_name: "",
    description: "",
    address: "",
    telephone: "",
    tax_id: "",
    incorporation: "",
    underwriter: "",
    share_info: "",
    notes: "",
    forms_sl_status: "",
    timeframe_for_separation: "",
    separation_ratio: "",
    ticker_symbol: "",
    exchange_platform: "",
    timeframe_for_bc: "",
    us_counsel: "",
    offshore_counsel: "",
    cik: ""
  })

  // ⚡ SWR AGGRESSIVE CACHING for issuer data
  const fetcher = async (url) => {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch')
    return res.json()
  }

  const swrConfig = {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateOnMount: true,
    dedupingInterval: 300000, // 5 min
    refreshInterval: 0,
    shouldRetryOnError: false,
    revalidateIfStale: false,
  }

  const { data: issuerData, mutate: mutateIssuer, isLoading: issuerLoading } = useSWR(
    issuerId ? `/api/issuers/${issuerId}` : null,
    fetcher,
    swrConfig
  )

  const { data: documents = [], mutate: mutateDocuments, isLoading: documentsLoading } = useSWR(
    issuerId ? `/api/documents?issuerId=${issuerId}` : null,
    fetcher,
    swrConfig
  )

  const loading = issuerLoading || documentsLoading

  // Update form data when issuer data loads
  useEffect(() => {
    if (issuerData) {
      setFormData({
        status: issuerData.status || "active",
        issuer_name: issuerData.issuer_name || "",
        display_name: issuerData.display_name || "",
        description: issuerData.description || "",
        address: issuerData.address || "",
        telephone: issuerData.telephone || "",
        tax_id: issuerData.tax_id || "",
        incorporation: issuerData.incorporation || "",
        underwriter: issuerData.underwriter || "",
        share_info: issuerData.share_info || "",
        notes: issuerData.notes || "",
        forms_sl_status: issuerData.forms_sl_status || "",
        timeframe_for_separation: issuerData.timeframe_for_separation || "",
        separation_ratio: issuerData.separation_ratio || "",
        ticker_symbol: issuerData.ticker_symbol || "",
        exchange_platform: issuerData.exchange_platform || "",
        timeframe_for_bc: issuerData.timeframe_for_bc || "",
        us_counsel: issuerData.us_counsel || "",
        offshore_counsel: issuerData.offshore_counsel || "",
        cik: issuerData.cik || ""
      })
    }
  }, [issuerData])

  const isSuspended = formData.status === 'suspended'

  // Suspended issuers are ALWAYS read-only for content fields (even for super admins)
  // Super admins can only change the STATUS field to un-suspend an issuer
  const isFieldsDisabled = isSuspended

  const fetchDocuments = async () => {
    // Revalidate SWR cache
    await mutateDocuments()
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/issuers/${issuerId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to update issuer')
      }

      const updatedIssuer = await response.json()

      // ⚡ Revalidate SWR cache
      await mutateIssuer(updatedIssuer, false)

      toast.success('Issuer details updated successfully')

      if (onSave) {
        onSave(updatedIssuer)
      }
    } catch (error) {
      console.error('Error updating issuer:', error)
      toast.error('Failed to update issuer details')
    } finally {
      setSaving(false)
    }
  }

  const handleDocumentChange = () => {
    fetchDocuments()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">Loading issuer details...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Suspended Warning Banner */}
      {isSuspended && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          <div>
            <p className="font-semibold text-destructive">This issuer is suspended</p>
            <p className="text-sm text-destructive/80">All data is in read-only mode. No modifications can be made to this issuer's records.</p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-card p-6 rounded-xl shadow-sm border border-border mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <Building className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Edit Issuer Details</h1>
              <p className="text-muted-foreground mt-1">Manage your issuer information and documents</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={handleSave}
              disabled={saving || (isSuspended && !isSuperAdmin())}
              className="bg-wealth-gradient text-black font-bold hover:opacity-90 border-0 shadow-lg flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </Button>
            {onClose && (
              <Button
                variant="outline"
                onClick={onClose}
                className="flex items-center space-x-2 border-input hover:bg-accent text-foreground"
              >
                <X className="h-4 w-4" />
                <span>Close</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Issuer Status - Super Admin Only */}
      {isSuperAdmin() && (
        <Card className="bg-card shadow-sm border border-border rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Issuer Status
              <span className="text-xs font-normal text-muted-foreground ml-2">(Super Admin Only)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => handleInputChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {ISSUER_STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-2">
                Suspended issuers are in read-only mode. All data is preserved but no modifications can be made.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Basic Information */}
      <Card className={`bg-card shadow-sm border border-border rounded-xl ${isFieldsDisabled ? 'opacity-75' : ''}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Issuer Name *</Label>
              <Input
                value={formData.issuer_name}
                onChange={(e) => handleInputChange('issuer_name', e.target.value)}
                placeholder="Enter issuer name"
                disabled={isFieldsDisabled}
              />
            </div>
            <div>
              <Label>Display Name</Label>
              <Input
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                placeholder="Enter display name"
                disabled={isFieldsDisabled}
              />
            </div>
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Enter description"
              rows={3}
              disabled={isFieldsDisabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Address</Label>
              <Textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                placeholder="Enter address"
                rows={3}
                disabled={isFieldsDisabled}
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label>Telephone</Label>
                <Input
                  value={formData.telephone}
                  onChange={(e) => handleInputChange('telephone', e.target.value)}
                  placeholder="Enter telephone"
                  disabled={isFieldsDisabled}
                />
              </div>
              <div>
                <Label>Tax ID</Label>
                <Input
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  placeholder="Enter tax ID"
                  disabled={isFieldsDisabled}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Details */}
      <Card className={`bg-card shadow-sm border border-border rounded-xl ${isFieldsDisabled ? 'opacity-75' : ''}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Company Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Incorporation</Label>
              <Input
                value={formData.incorporation}
                onChange={(e) => handleInputChange('incorporation', e.target.value)}
                placeholder="State/Country of incorporation"
                disabled={isFieldsDisabled}
              />
            </div>
            <div>
              <Label>Underwriter</Label>
              <Input
                value={formData.underwriter}
                onChange={(e) => handleInputChange('underwriter', e.target.value)}
                placeholder="Enter underwriter"
                disabled={isFieldsDisabled}
              />
            </div>
          </div>

          <div>
            <Label>Share Information</Label>
            <Textarea
              value={formData.share_info}
              onChange={(e) => handleInputChange('share_info', e.target.value)}
              placeholder="Enter share information"
              rows={3}
              disabled={isFieldsDisabled}
            />
          </div>

          <div>
            <Label>Notes</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Enter notes"
              rows={3}
              disabled={isFieldsDisabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Information */}
      <Card className={`bg-card shadow-sm border border-border rounded-xl ${isFieldsDisabled ? 'opacity-75' : ''}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Regulatory Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Form S-1 Status</Label>
              <Select
                value={formData.forms_sl_status}
                onValueChange={(value) => handleInputChange('forms_sl_status', value)}
                disabled={isFieldsDisabled}
              >
                <SelectTrigger disabled={isFieldsDisabled}>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {FORM_STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ticker Symbol</Label>
              <Input
                value={formData.ticker_symbol}
                onChange={(e) => handleInputChange('ticker_symbol', e.target.value.toUpperCase())}
                placeholder="e.g. CRAU, AAPL"
                className="uppercase"
                disabled={isFieldsDisabled}
              />
              <p className="text-xs text-muted-foreground mt-1">Used for market chart display</p>
            </div>
            <div>
              <Label>Exchange Platform</Label>
              <Input
                value={formData.exchange_platform}
                onChange={(e) => handleInputChange('exchange_platform', e.target.value)}
                placeholder="e.g. NASDAQ, NYSE"
                disabled={isFieldsDisabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>CIK Number</Label>
              <Input
                value={formData.cik}
                onChange={(e) => handleInputChange('cik', e.target.value)}
                placeholder="e.g. 2058359"
                maxLength={10}
                disabled={isFieldsDisabled}
              />
              <p className="text-xs text-muted-foreground mt-1">SEC Central Index Key for EDGAR filings</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Timeframe for Separation</Label>
              <Input
                value={formData.timeframe_for_separation}
                onChange={(e) => handleInputChange('timeframe_for_separation', e.target.value)}
                placeholder="Enter timeframe"
                disabled={isFieldsDisabled}
              />
            </div>
            <div>
              <Label>Separation Ratio</Label>
              <Input
                value={formData.separation_ratio}
                onChange={(e) => handleInputChange('separation_ratio', e.target.value)}
                placeholder="Enter separation ratio"
                disabled={isFieldsDisabled}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Timeframe for Business Combination</Label>
              <Input
                value={formData.timeframe_for_bc}
                onChange={(e) => handleInputChange('timeframe_for_bc', e.target.value)}
                placeholder="Enter timeframe"
                disabled={isFieldsDisabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legal Counsel */}
      <Card className={`bg-card shadow-sm border border-border rounded-xl ${isFieldsDisabled ? 'opacity-75' : ''}`}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-foreground">Legal Counsel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>US Counsel</Label>
              <Input
                value={formData.us_counsel}
                onChange={(e) => handleInputChange('us_counsel', e.target.value)}
                placeholder="Enter US counsel"
                disabled={isFieldsDisabled}
              />
            </div>
            <div>
              <Label>Offshore Counsel</Label>
              <Input
                value={formData.offshore_counsel}
                onChange={(e) => handleInputChange('offshore_counsel', e.target.value)}
                placeholder="Enter offshore counsel"
                disabled={isFieldsDisabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Management */}
      <div className={`bg-card p-6 rounded-xl shadow-sm border border-border ${isFieldsDisabled ? 'opacity-75' : ''}`}>
        <h3 className="text-lg font-semibold mb-6 flex items-center text-foreground">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
            <FileText className="h-4 w-4 text-primary-foreground" />
          </div>
          Document Management
        </h3>
        <DocumentUpload
          issuerId={issuerId}
          documents={documents}
          onDocumentChange={handleDocumentChange}
          allowEdit={!isFieldsDisabled}
        />
      </div>
    </div>
  )
}