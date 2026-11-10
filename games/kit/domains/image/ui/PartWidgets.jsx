import ParamControl from './ParamControl.jsx'

function ImageKernel({ value, setting, onChange, readOnly, roomy }) {
  return <ParamControl param={{ kind: 'kernel', label: setting.label, learnable: readOnly }} value={value ?? []} onChange={onChange} roomy={roomy} />
}

export const IMAGE_WIDGETS = { imageKernel: ImageKernel }
