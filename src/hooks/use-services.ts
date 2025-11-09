
import type { Service } from "@/types";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export function useServices() {
    const token = null; // Temporary
    const instance = "";
    const query = useQuery<Service[]>({
        queryKey: ["services"],
        queryFn: async () => {
            const response = await axios.get(`${instance}/services`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            return response?.data;
        },
        staleTime: 5 * 60 * 1000,
    });

    const tmp: Service[] = [
        {
            id: "dummy-service-001",
            name: "Dummy Service",
            description:
                "A sample service for testing and development purposes",
            source: "remote",
            remote: "https://gitlab.com/satoshi/nakamoto",
            commit_hash: "ijfweonoi3nifjo32k",
            branch: "master",
            region: "North America",
            runtime: "nodejs",
            runtime_version: "18.0.0",
            status: "stopped",
            build_cmd: "npm install",
            dns_provider: "cloudflare",
            domain: "myapp.foo",
            port: 9090,
            run_cmd: "npm build",
            static_dir: "apps/test/public",
            working_dir: "apps",
            env_vars: {
                PORT: "9090",
            },
            blueprint: {
                name: "Old County Times Py 455",
                description: "A simple newspaper app demo",
                source: "remote",
                runtime: {
                    type: "python",
                    version: "3.9.1",
                },
                remote: {
                    url: "https://github.com/dployr-io/dployr-examples",
                    branch: "master",
                    commit_hash: "",
                },
                run_cmd: "python run.py",
                build_cmd: "pip install -r requirements.txt",
                port: 5000,
                working_dir: "python",
                env_vars: {
                    PORT: "5000",
                },
            },
            created_at: new Date(),
            updated_at: new Date(),
            last_deployed: new Date(),
        },
    ];

    const pathSegments = window.location.pathname.split("/");
    const id = pathSegments[pathSegments.indexOf("services") + 1];

    const selectedService = id
        ? tmp?.find((service) => service.id === id) || null
        : null;

    return {
        // services: query.data,
        selectedService: selectedService,
        services: tmp,
        isLoading: query.isLoading,
    };
}
