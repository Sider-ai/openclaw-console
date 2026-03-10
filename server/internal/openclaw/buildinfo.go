package openclaw

import "runtime/debug"

func ReadBuildInfoResource() BuildInfoResource {
	info, ok := debug.ReadBuildInfo()
	if !ok || info == nil {
		return BuildInfoResource{}
	}

	var resource BuildInfoResource
	for _, setting := range info.Settings {
		switch setting.Key {
		case "vcs.revision":
			resource.Revision = setting.Value
		case "vcs.time":
			resource.Time = setting.Value
		case "vcs.modified":
			resource.Modified = setting.Value == "true"
		}
	}
	return resource
}
