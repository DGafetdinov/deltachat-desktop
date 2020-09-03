import React, { useContext, useState } from 'react'
import { ScreenContext } from '../../contexts'
import { toASCII } from 'punycode'
import { OpenDialogFunctionType } from '../dialogs/DialogController'
import {
  SmallDialog,
  DeltaDialogFooterActions,
  DeltaDialogFooter,
} from '../dialogs/DeltaDialog'
import { DeltaCheckbox } from '../contact/ContactListItem'
import { getLogger } from '../../../shared/logger'

import UrlParser from 'url-parse'

const log = getLogger('renderer/LabeledLink')

const { openExternal } = window.electron_functions

function getTrustedDomains(): string[] {
  return JSON.parse(localStorage.getItem('trustedDomains') || '[]')
}

function trustDomain(domain: string) {
  log.info('trustDomain', domain)
  const trusted: string[] = getTrustedDomains()
  trusted.push(domain)
  localStorage.setItem('trustedDomains', JSON.stringify(trusted))
}

function isDomainTrusted(domain: string): boolean {
  return getTrustedDomains().includes(domain)
}

function punycodeCheck(url: string) {
  const URL = UrlParser(url)
  // encode the punycode to make phishing harder
  const originalHostname = URL.hostname
  URL.set(
    'hostname',
    URL.hostname
      .split('.')
      .map(toASCII)
      .join('.')
  )
  return {
    asciiUrl: URL.toString(),
    originalHostname,
    asciiHostname: URL.hostname,
    hasPunycode: URL.toString() != url,
  }
}

export const LabeledLink = ({
  label,
  target,
}: {
  label: string
  target: string
}) => {
  const { openDialog } = useContext(ScreenContext)

  const url = UrlParser(target)
  // encode the punycode to make phishing harder
  url.set(
    'hostname',
    url.hostname
      .split('.')
      .map(toASCII)
      .join('.')
  )

  const onClick = (ev: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    ev.preventDefault()
    ev.stopPropagation()
    //check if domain is trusted
    if (isDomainTrusted(url.hostname)) {
      openExternal(target)
      return
    }
    // not trusted - ask for confimation from user
    labeledLinkConfirmationDialog(
      openDialog as OpenDialogFunctionType,
      url.toString(),
      url.hostname,
      target
    )
  }
  return (
    <a
      href='#'
      {...{ 'x-target': target }}
      title={url.toString()}
      onClick={onClick}
    >
      {String(label)}
    </a>
  )
}

function labeledLinkConfirmationDialog(
  openDialog: OpenDialogFunctionType,
  sanitizedTarget: string,
  hostname: string,
  target: string
) {
  openDialog(({ isOpen, onClose }) => {
    const tx = window.static_translate
    const [isChecked, setIsChecked] = useState(false)
    const toggleIsChecked = () => setIsChecked(checked => !checked)
    return (
      <SmallDialog isOpen={isOpen} onClose={onClose}>
        <div className='bp3-dialog-body-with-padding'>
          <p>{tx('open_url_confirmation')}</p>
          <p
            style={{
              overflowWrap: 'break-word',
              overflowY: 'scroll',
              maxHeight: '50vh',
            }}
          >
            {sanitizedTarget}
          </p>
          <div style={{ display: 'flex' }}>
            <DeltaCheckbox checked={isChecked} onClick={toggleIsChecked} />
            <div style={{ alignSelf: 'center' }}>
              {tx('open_external_url_trust_domain') + ' '}
              <i>{hostname}</i>
            </div>
          </div>
          <DeltaDialogFooter>
            <DeltaDialogFooterActions>
              <p className={`delta-button bold primary`} onClick={onClose}>
                {tx('no')}
              </p>
              <p
                className={`delta-button bold primary`}
                onClick={() => {
                  onClose()
                  navigator.clipboard.writeText(target)
                }}
              >
                {tx('menu_copy_link_to_clipboard')}
              </p>
              <p
                className={`delta-button bold primary`}
                onClick={() => {
                  onClose()
                  if (isChecked) {
                    // trust url
                    trustDomain(hostname)
                  }
                  openExternal(target)
                }}
              >
                {tx('open')}
              </p>
            </DeltaDialogFooterActions>
          </DeltaDialogFooter>
        </div>
      </SmallDialog>
    )
  })
}

export const Link = ({ target }: { target: string }) => {
  const { openDialog } = useContext(ScreenContext)

  const {
    originalHostname,
    asciiHostname,
    hasPunycode,
    asciiUrl,
  } = punycodeCheck(target)

  const onClick = (ev: any) => {
    ev.preventDefault()
    ev.stopPropagation()

    if (hasPunycode) {
      openPunycodeUrlConfirmationDialog(
        openDialog as OpenDialogFunctionType,
        originalHostname,
        asciiHostname,
        asciiUrl
      )
    } else {
      openExternal(target)
    }
  }
  return (
    <a
      href='#'
      {...{ 'x-target': asciiUrl }}
      title={asciiUrl}
      onClick={onClick}
    >
      {target}
    </a>
  )
}

function openPunycodeUrlConfirmationDialog(
  openDialog: OpenDialogFunctionType,
  originalHostname: string,
  asciiHostname: string,
  asciiUrl: string
) {
  openDialog(({ isOpen, onClose }) => {
    const tx = window.static_translate
    return (
      <SmallDialog isOpen={isOpen} onClose={onClose}>
        <div className='bp3-dialog-body-with-padding'>
          <div
            style={{
              fontSize: '1.5em',
              fontWeight: 'lighter',
              marginBottom: '6px',
            }}
          >
            ⚠ Suspicious Link detected
          </div>
          <p>
            Are you sure you want to visit <b>{asciiHostname}</b>?
          </p>
          <hr />
          <p>
            You followed a link which could be misrepresenting characters by
            using similarly looking ones from different alphabets. Following the
            link labelled <b>{originalHostname}</b> will lead to{' '}
            <b>{asciiHostname}</b> which is normal for non-Latin characters. If
            you did not expect such characters this link could be harmful.
          </p>
          <DeltaDialogFooter>
            <DeltaDialogFooterActions>
              <p className={`delta-button bold primary`} onClick={onClose}>
                {tx('no')}
              </p>
              <p
                className={`delta-button bold primary`}
                onClick={() => {
                  onClose()
                  openExternal(asciiUrl)
                }}
              >
                {tx('open')}
              </p>
            </DeltaDialogFooterActions>
          </DeltaDialogFooter>
        </div>
      </SmallDialog>
    )
  })
}
